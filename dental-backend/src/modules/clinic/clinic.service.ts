import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateClinicDto, UpdateClinicDto } from './dto/index.js';
import { Clinic } from '@prisma/client';

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClinicDto): Promise<Clinic> {
    return this.prisma.clinic.create({ data: dto });
  }

  async findAll(): Promise<Clinic[]> {
    return this.prisma.clinic.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string): Promise<Clinic> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${id}" not found`);
    }
    return clinic;
  }

  async update(id: string, dto: UpdateClinicDto): Promise<Clinic> {
    await this.findOne(id);
    return this.prisma.clinic.update({
      where: { id },
      data: dto,
    });
  }
}
