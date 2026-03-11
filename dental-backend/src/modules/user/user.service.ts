import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { User } from '@prisma/client';

const userSelect = {
  id: true,
  clinic_id: true,
  branch_id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

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

  async findAll(clinicId: string, role?: string): Promise<Omit<User, 'password_hash'>[]> {
    return this.prisma.user.findMany({
      where: {
        clinic_id: clinicId,
        ...(role ? { role } : {}),
      },
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
