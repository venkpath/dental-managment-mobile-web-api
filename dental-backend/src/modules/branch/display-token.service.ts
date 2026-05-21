import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class DisplayTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private generateToken(): string {
    return randomBytes(9).toString('hex'); // 18 hex chars — hard to guess
  }

  private getBaseUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
  }

  async generate(clinicId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { clinic: { select: { name: true } } },
    });
    if (!branch || branch.clinic_id !== clinicId) throw new NotFoundException('Branch not found');

    let token: string;
    let attempts = 0;
    do {
      token = this.generateToken();
      const existing = await this.prisma.branch.findUnique({ where: { display_token: token } });
      if (!existing) break;
      if (++attempts > 10) throw new BadRequestException('Could not generate unique display token');
    } while (true);

    await this.prisma.branch.update({
      where: { id: branchId },
      data: { display_token: token, display_token_enabled: true },
    });

    return {
      token,
      display_url: `${this.getBaseUrl()}/display/${token}`,
      branch_name: branch.name,
      enabled: true,
    };
  }

  async get(clinicId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { clinic: { select: { name: true } } },
    });
    if (!branch || branch.clinic_id !== clinicId) throw new NotFoundException('Branch not found');

    if (!branch.display_token) {
      return { enabled: false, token: null, display_url: null, branch_name: branch.name };
    }

    return {
      token: branch.display_token,
      display_url: `${this.getBaseUrl()}/display/${branch.display_token}`,
      branch_name: branch.name,
      enabled: branch.display_token_enabled,
    };
  }

  async revoke(clinicId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.clinic_id !== clinicId) throw new NotFoundException('Branch not found');
    await this.prisma.branch.update({
      where: { id: branchId },
      data: { display_token: null, display_token_enabled: false },
    });
    return { message: 'Display link revoked' };
  }
}
