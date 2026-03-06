import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { CreateSuperAdminDto } from './dto/index.js';
import { SuperAdmin } from '@prisma/client';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(dto: CreateSuperAdminDto): Promise<Omit<SuperAdmin, 'password_hash'>> {
    const existing = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Super admin with email "${dto.email}" already exists`);
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const admin = await this.prisma.superAdmin.create({
      data: {
        name: dto.name,
        email: dto.email,
        password_hash: passwordHash,
      },
    });

    const { password_hash: _, ...result } = admin;
    return result;
  }

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findUnique({ where: { email } });
  }

  async findOne(id: string): Promise<Omit<SuperAdmin, 'password_hash'>> {
    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`Super admin not found`);
    }
    const { password_hash: _, ...result } = admin;
    return result;
  }
}
