import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/index.js';
import { Branch } from '@prisma/client';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBranchDto): Promise<Branch> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinic_id },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${dto.clinic_id}" not found`);
    }
    return this.prisma.branch.create({ data: dto });
  }

  async findAll(): Promise<Branch[]> {
    return this.prisma.branch.findMany({
      orderBy: { created_at: 'desc' },
      include: { clinic: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { clinic: { select: { id: true, name: true } } },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID "${id}" not found`);
    }
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }
}
