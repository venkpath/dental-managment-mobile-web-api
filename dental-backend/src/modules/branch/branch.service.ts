import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/index.js';
import { Branch } from '@prisma/client';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreateBranchDto): Promise<Branch> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found`);
    }
    return this.prisma.branch.create({
      data: { ...dto, clinic_id: clinicId },
    });
  }

  async findAll(clinicId: string): Promise<Branch[]> {
    return this.prisma.branch.findMany({
      where: { clinic_id: clinicId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(clinicId: string, id: string): Promise<Branch> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${id}" not found`);
    }
    return branch;
  }

  async update(clinicId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    await this.findOne(clinicId, id);
    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }
}
