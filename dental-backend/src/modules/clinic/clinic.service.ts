import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { Clinic } from '@prisma/client';

const TRIAL_DAYS = 14;

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClinicDto): Promise<Clinic> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return this.prisma.clinic.create({
      data: {
        ...dto,
        trial_ends_at: trialEndsAt,
      },
    });
  }

  async findAll(): Promise<Clinic[]> {
    return this.prisma.clinic.findMany({
      orderBy: { created_at: 'desc' },
      include: { plan: true },
    });
  }

  async findOne(id: string): Promise<Clinic> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${id}" not found`);
    }
    return clinic;
  }

  async getFeatures(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        plan: {
          select: {
            name: true,
            price_monthly: true,
            max_branches: true,
            max_staff: true,
            ai_quota: true,
            max_patients_per_month: true,
            max_appointments_per_month: true,
            plan_features: {
              where: { is_enabled: true },
              select: { feature: { select: { key: true } } },
            },
          },
        },
      },
    });

    if (!clinic) throw new NotFoundException(`Clinic with ID "${clinicId}" not found`);

    const plan = clinic.plan;
    return {
      plan: plan
        ? {
            name: plan.name,
            price_monthly: Number(plan.price_monthly),
            max_branches: plan.max_branches,
            max_staff: plan.max_staff,
            ai_quota: plan.ai_quota,
            max_patients_per_month: plan.max_patients_per_month,
            max_appointments_per_month: plan.max_appointments_per_month,
          }
        : null,
      features: plan?.plan_features.map((pf) => pf.feature.key) ?? [],
    };
  }

  async update(id: string, dto: UpdateClinicDto): Promise<Clinic> {
    await this.findOne(id);
    return this.prisma.clinic.update({
      where: { id },
      data: dto,
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<Clinic> {
    await this.findOne(id);
    const { trial_ends_at, ...rest } = dto;
    return this.prisma.clinic.update({
      where: { id },
      data: {
        ...rest,
        ...(trial_ends_at !== undefined ? { trial_ends_at: new Date(trial_ends_at) } : {}),
      },
      include: { plan: true },
    });
  }
}
