import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateFeatureDto } from './dto/index.js';
import { Feature } from '@prisma/client';

@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeatureDto): Promise<Feature> {
    const existing = await this.prisma.feature.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Feature with key "${dto.key}" already exists`);
    }
    return this.prisma.feature.create({ data: dto });
  }

  async findAll(): Promise<Feature[]> {
    return this.prisma.feature.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async remove(id: string): Promise<Feature> {
    const feature = await this.prisma.feature.findUnique({ where: { id } });
    if (!feature) {
      throw new ConflictException(`Feature with ID "${id}" not found`);
    }
    // PlanFeatures referencing this feature will be cascade deleted
    return this.prisma.feature.delete({ where: { id } });
  }
}
