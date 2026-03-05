import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { User } from '@prisma/client';
import { createHash } from 'crypto';

// Temporary hash until bcrypt is added with auth module
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinic_id },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${dto.clinic_id}" not found`);
    }

    if (dto.branch_id) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branch_id },
      });
      if (!branch || branch.clinic_id !== dto.clinic_id) {
        throw new NotFoundException(
          `Branch with ID "${dto.branch_id}" not found in this clinic`,
        );
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email_clinic_id: { email: dto.email, clinic_id: dto.clinic_id } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this clinic');
    }

    const { password, ...rest } = dto;
    return this.prisma.user.create({
      data: { ...rest, password_hash: hashPassword(password) },
      select: userSelect,
    });
  }

  async findAll(clinicId?: string): Promise<Omit<User, 'password_hash'>[]> {
    return this.prisma.user.findMany({
      where: clinicId ? { clinic_id: clinicId } : undefined,
      orderBy: { created_at: 'desc' },
      select: userSelect,
    });
  }

  async findOne(id: string): Promise<Omit<User, 'password_hash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'password_hash'>> {
    const user = await this.findOne(id);
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
