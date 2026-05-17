import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ClinicFeatureService } from '../feature/clinic-feature.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { Clinic } from '@prisma/client';

const TRIAL_DAYS = 14;

@Injectable()
export class ClinicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicFeatureService: ClinicFeatureService,
  ) {}

  async create(dto: CreateClinicDto): Promise<Clinic> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return this.prisma.clinic.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...dto,
        trial_ends_at: trialEndsAt,
      } as any,
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
        billing_cycle: true,
        plan: { select: { name: true, price_monthly: true } },
      },
    });

    if (!clinic) throw new NotFoundException(`Clinic with ID "${clinicId}" not found`);

    // Effective set = plan defaults merged with per-clinic feature + limit +
    // price overrides. The frontend uses these for UI gating; the backend
    // also enforces the same effective values (PlanLimitService,
    // FeatureGuard, AiUsageService, renewal cron), so the two stay in sync
    // from a single source.
    const billingCycle = (clinic.billing_cycle as 'monthly' | 'yearly') || 'monthly';
    const [features, limits, effectivePrice] = await Promise.all([
      this.clinicFeatureService.getEffectiveFeatureKeys(clinicId),
      this.clinicFeatureService.getEffectiveLimits(clinicId),
      this.clinicFeatureService.getEffectivePrice(clinicId, billingCycle),
    ]);

    return {
      plan: clinic.plan
        ? {
            name: clinic.plan.name,
            // price_monthly stays as the plan's list price so the UI can show
            // "Original ₹X" when a discount is active. effective_price /
            // discount fields below are the source of truth for what the
            // customer actually pays.
            price_monthly: Number(clinic.plan.price_monthly),
            effective_price: effectivePrice.amount,
            price_source: effectivePrice.source,
            custom_price_expires_at: effectivePrice.custom_expires_at,
            ...limits,
          }
        : null,
      features,
    };
  }

  async update(id: string, dto: UpdateClinicDto): Promise<Clinic> {
    await this.findOne(id);
    return this.prisma.clinic.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: dto as any,
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<Clinic> {
    await this.findOne(id);
    const { trial_ends_at, next_billing_at, billing_cycle, ...rest } = dto;

    // When billing_cycle is flipped without an explicit next_billing_at, auto-
    // anchor the next renewal to one full cycle from now so the renewal cron
    // fires on the right date rather than the stale old-cycle anchor.
    let resolvedNextBillingAt = next_billing_at;
    if (billing_cycle !== undefined && next_billing_at === undefined) {
      const anchor = new Date();
      if (billing_cycle === 'yearly') {
        anchor.setFullYear(anchor.getFullYear() + 1);
      } else {
        anchor.setMonth(anchor.getMonth() + 1);
      }
      resolvedNextBillingAt = anchor.toISOString();
    }

    return this.prisma.clinic.update({
      where: { id },
      data: {
        ...rest,
        ...(billing_cycle !== undefined ? { billing_cycle } : {}),
        ...(trial_ends_at !== undefined ? { trial_ends_at: new Date(trial_ends_at) } : {}),
        // Allow explicit null to clear the next-billing anchor (e.g. when
        // moving a clinic back to trial). undefined keeps the existing value.
        ...(resolvedNextBillingAt !== undefined
          ? { next_billing_at: resolvedNextBillingAt === null ? null : new Date(resolvedNextBillingAt) }
          : {}),
      },
      include: { plan: true },
    });
  }
}
