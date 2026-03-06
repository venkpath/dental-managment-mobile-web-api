import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePlanDto, UpdatePlanDto, AssignFeaturesDto } from './dto/index.js';
import { Plan, PlanFeature } from '@prisma/client';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    const existing = await this.prisma.plan.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Plan with name "${dto.name}" already exists`);
    }
    return this.prisma.plan.create({ data: dto });
  }

  async findAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with ID "${id}" not found`);
    }
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.plan.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Plan with name "${dto.name}" already exists`);
      }
    }
    return this.prisma.plan.update({
      where: { id },
      data: dto,
    });
  }

  async assignFeatures(planId: string, dto: AssignFeaturesDto): Promise<PlanFeature[]> {
    await this.findOne(planId);

    // Validate all feature IDs exist
    const featureIds = dto.features.map((f) => f.feature_id);
    const existingFeatures = await this.prisma.feature.findMany({
      where: { id: { in: featureIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingFeatures.map((f) => f.id));
    const missingIds = featureIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`Features not found: ${missingIds.join(', ')}`);
    }

    // Upsert each plan-feature mapping
    const results: PlanFeature[] = [];
    for (const item of dto.features) {
      const result = await this.prisma.planFeature.upsert({
        where: {
          plan_id_feature_id: { plan_id: planId, feature_id: item.feature_id },
        },
        update: { is_enabled: item.is_enabled ?? true },
        create: {
          plan_id: planId,
          feature_id: item.feature_id,
          is_enabled: item.is_enabled ?? true,
        },
      });
      results.push(result);
    }

    return results;
  }

  async getFeatures(planId: string): Promise<PlanFeature[]> {
    await this.findOne(planId);
    return this.prisma.planFeature.findMany({
      where: { plan_id: planId },
      include: { feature: true },
    });
  }
}
