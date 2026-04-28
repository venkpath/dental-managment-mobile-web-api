import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { User } from '@prisma/client';

const userSelect = {
  id: true,
  clinic_id: true,
  branch_id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  email_verified: true,
  phone_verified: true,
  license_number: true,
  signature_url: true,
  created_at: true,
  updated_at: true,
} as const;

const SIGNATURE_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const SIGNATURE_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly s3Service: S3Service,
  ) {}

  /** Upload a signature image for a user. Stored in S3 under a per-clinic
   *  key; the key is saved on user.signature_url and re-fetched at PDF
   *  generation time so signed URLs never expire mid-print. */
  async uploadSignature(
    clinicId: string,
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
  ): Promise<{ signature_url: string }> {
    await this.findOne(clinicId, userId);

    if (!file?.buffer || file.size === 0) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.size > SIGNATURE_MAX_BYTES) {
      throw new BadRequestException('Signature must be 1 MB or smaller');
    }
    if (!SIGNATURE_ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Signature must be a PNG, JPEG, or WebP image');
    }

    const ext = file.mimetype === 'image/png'  ? 'png'
              : file.mimetype === 'image/webp' ? 'webp'
              : 'jpg';
    const key = `clinics/${clinicId}/doctor-signatures/${userId}.${ext}`;
    await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.prisma.user.update({
      where: { id: userId },
      data: { signature_url: key },
    });

    return { signature_url: key };
  }

  async create(clinicId: string, dto: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found`);
    }

    if (dto.branch_id) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branch_id },
      });
      if (!branch || branch.clinic_id !== clinicId) {
        throw new NotFoundException(
          `Branch with ID "${dto.branch_id}" not found in this clinic`,
        );
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email_clinic_id: { email: dto.email, clinic_id: clinicId } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this clinic');
    }

    const { password, ...rest } = dto;
    const finalPassword = password || 'Admin@123';
    return this.prisma.user.create({
      data: { ...rest, clinic_id: clinicId, password_hash: await this.passwordService.hash(finalPassword) },
      select: userSelect,
    });
  }

  async findByEmail(email: string, clinicId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email_clinic_id: { email, clinic_id: clinicId } },
    });
  }

  async findAll(clinicId: string, role?: string, search?: string, branchId?: string): Promise<Omit<User, 'password_hash'>[]> {
    const where: any = { clinic_id: clinicId };
    if (role) {
      // Accept comma-separated roles, e.g. "Dentist,Consultant"
      const roles = role.split(',').map((r) => r.trim()).filter(Boolean);
      where.role = roles.length > 1 ? { in: roles } : roles[0];
    }
    if (branchId) where.branch_id = branchId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: userSelect,
    });
  }

  async findOne(clinicId: string, id: string): Promise<Omit<User, 'password_hash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user || user.clinic_id !== clinicId) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async remove(clinicId: string, id: string): Promise<{ message: string }> {
    await this.findOne(clinicId, id); // validates existence + clinic ownership
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async update(clinicId: string, id: string, dto: UpdateUserDto): Promise<Omit<User, 'password_hash'>> {
    const user = await this.findOne(clinicId, id);
    if (dto.branch_id) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branch_id },
      });
      if (!branch || branch.clinic_id !== user.clinic_id) {
        throw new NotFoundException(
          `Branch with ID "${dto.branch_id}" not found in this clinic`,
        );
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: userSelect,
    });
  }
}
