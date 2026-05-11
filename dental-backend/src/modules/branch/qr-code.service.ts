import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export type BranchWithClinic = Prisma.BranchGetPayload<{
  include: { clinic: { select: { id: true; name: true; logo_url: true } } };
}>;

@Injectable()
export class QrCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private generateToken(): string {
    return randomBytes(5).toString('hex').toUpperCase();
  }

  private getBaseUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  }

  async generate(clinicId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { clinic: { select: { name: true } } },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch not found`);
    }

    let token: string;
    let attempts = 0;
    do {
      token = this.generateToken();
      const existing = await this.prisma.branch.findUnique({ where: { qr_code_token: token } });
      if (!existing) break;
      attempts++;
      if (attempts > 10) throw new BadRequestException('Could not generate unique QR token');
    } while (true);

    await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        qr_code_token: token,
        qr_code_enabled: true,
        qr_code_generated_at: new Date(),
      },
    });

    const selfRegisterUrl = `${this.getBaseUrl()}/self-register?token=${token}`;
    const qrDataUrl = await QRCode.toDataURL(selfRegisterUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return {
      token,
      qr_link: selfRegisterUrl,
      qr_data_url: qrDataUrl,
      clinic_name: branch.clinic.name,
      branch_name: branch.name,
      enabled: true,
      generated_at: new Date(),
    };
  }

  async get(clinicId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { clinic: { select: { name: true } } },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch not found`);
    }

    if (!branch.qr_code_token) {
      return { enabled: false, token: null, qr_link: null, qr_data_url: null, clinic_name: branch.clinic.name, generated_at: null };
    }

    const selfRegisterUrl = `${this.getBaseUrl()}/self-register?token=${branch.qr_code_token}`;
    // Skip the (CPU-bound) QR render when the code is disabled — the frontend
    // hides the image in that state anyway.
    const qrDataUrl = branch.qr_code_enabled
      ? await QRCode.toDataURL(selfRegisterUrl, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        })
      : null;

    return {
      token: branch.qr_code_token,
      qr_link: selfRegisterUrl,
      qr_data_url: qrDataUrl,
      clinic_name: branch.clinic.name,
      branch_name: branch.name,
      enabled: branch.qr_code_enabled,
      generated_at: branch.qr_code_generated_at,
    };
  }

  async disable(clinicId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch not found`);
    }
    await this.prisma.branch.update({
      where: { id: branchId },
      data: { qr_code_enabled: false },
    });
    return { message: 'QR code disabled' };
  }

  async findBranchByToken(token: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { qr_code_token: token },
      include: { clinic: { select: { id: true, name: true, logo_url: true } } },
    });
    if (!branch) throw new NotFoundException('Invalid or expired QR code');
    if (!branch.qr_code_enabled) throw new BadRequestException('QR code is disabled');
    return branch;
  }
}
