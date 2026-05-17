import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';

export interface EffectiveFeatureRow {
  feature_id: string;
  key: string;
  description: string;
  is_enabled: boolean;
  source: 'plan' | 'override' | 'none';
  plan_enabled: boolean | null;
  override_enabled: boolean | null;
  /** True when an override exists but its is_enabled matches the plan default — admin UI should hint that the row is redundant and can be cleared. */
  redundant_with_plan: boolean;
  /** Free-text reason recorded by the granting super admin (override-only). */
  reason: string | null;
  /** Super admin who applied the override (override-only). */
  granted_by_super_admin_id: string | null;
  /** Optional auto-revert timestamp; expired rows are treated as if the override did not exist. */
  expires_at: Date | null;
}

/** Numeric limits resolved per-clinic = clinic.custom_* (if set) || plan.* (or null = unlimited). */
export interface EffectiveLimits {
  max_branches: number | null;
  max_staff: number | null;
  ai_quota: number | null;
  max_patients_per_month: number | null;
  max_appointments_per_month: number | null;
  max_invoices_per_month: number | null;
  max_treatments_per_month: number | null;
  max_prescriptions_per_month: number | null;
  max_consultations_per_month: number | null;
}

export interface FeatureOverrideUpsert {
  feature_id: string;
  /** null = remove the override row (revert to plan default). */
  is_enabled: boolean | null;
  reason?: string | null;
  expires_at?: Date | null;
}

@Injectable()
export class ClinicFeatureService {
  private readonly logger = new Logger(ClinicFeatureService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the effective feature set for a clinic by merging PlanFeature
   * (plan default) with ClinicFeatureOverride (per-clinic customisation).
   * Override wins when present and not expired; otherwise fall back to plan;
   * otherwise the feature is not granted.
   */
  async getEffectiveFeatures(clinicId: string): Promise<EffectiveFeatureRow[]> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, plan_id: true },
    });
    if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);

    const now = new Date();
    const [features, planFeatures, overrides] = await Promise.all([
      this.prisma.feature.findMany({ orderBy: { key: 'asc' } }),
      clinic.plan_id
        ? this.prisma.planFeature.findMany({ where: { plan_id: clinic.plan_id } })
        : Promise.resolve([] as Array<{ feature_id: string; is_enabled: boolean }>),
      this.prisma.clinicFeatureOverride.findMany({ where: { clinic_id: clinicId } }),
    ]);

    const planMap = new Map(planFeatures.map((pf) => [pf.feature_id, pf.is_enabled]));
    const overrideMap = new Map(overrides.map((o) => [o.feature_id, o]));

    return features.map((f) => {
      const planEnabled = planMap.has(f.id) ? planMap.get(f.id)! : null;
      const overrideRow = overrideMap.get(f.id) ?? null;
      const overrideActive = overrideRow && (!overrideRow.expires_at || overrideRow.expires_at > now);
      const overrideEnabled = overrideActive ? overrideRow!.is_enabled : null;

      let effective: boolean;
      let source: 'plan' | 'override' | 'none';
      if (overrideEnabled !== null) {
        effective = overrideEnabled;
        source = 'override';
      } else if (planEnabled !== null) {
        effective = planEnabled;
        source = 'plan';
      } else {
        effective = false;
        source = 'none';
      }
      return {
        feature_id: f.id,
        key: f.key,
        description: f.description,
        is_enabled: effective,
        source,
        plan_enabled: planEnabled,
        override_enabled: overrideEnabled,
        redundant_with_plan: source === 'override' && planEnabled === overrideEnabled,
        reason: overrideActive ? overrideRow!.reason : null,
        granted_by_super_admin_id: overrideActive ? overrideRow!.granted_by_super_admin_id : null,
        expires_at: overrideActive ? overrideRow!.expires_at : null,
      };
    });
  }

  /** Effective enabled feature keys only — for /me endpoints and the UI. */
  async getEffectiveFeatureKeys(clinicId: string): Promise<string[]> {
    const rows = await this.getEffectiveFeatures(clinicId);
    return rows.filter((r) => r.is_enabled).map((r) => r.key);
  }

  /**
   * Resolve numeric limits for a clinic: clinic.custom_* (if set) wins over
   * plan defaults; null on both = unlimited. Used by /me/features so the UI
   * sees the same caps the backend will enforce.
   */
  async getEffectiveLimits(clinicId: string): Promise<EffectiveLimits> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        custom_max_branches: true,
        custom_max_staff: true,
        ai_quota_override: true,
        custom_patient_limit: true,
        custom_appointment_limit: true,
        custom_invoice_limit: true,
        custom_treatment_limit: true,
        custom_prescription_limit: true,
        custom_consultation_limit: true,
        plan: {
          select: {
            max_branches: true,
            max_staff: true,
            ai_quota: true,
            max_patients_per_month: true,
            max_appointments_per_month: true,
            max_invoices_per_month: true,
            max_treatments_per_month: true,
            max_prescriptions_per_month: true,
            max_consultations_per_month: true,
          },
        },
      },
    });
    if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);

    const plan = clinic.plan;
    return {
      max_branches: clinic.custom_max_branches ?? plan?.max_branches ?? null,
      max_staff: clinic.custom_max_staff ?? plan?.max_staff ?? null,
      ai_quota: clinic.ai_quota_override ?? plan?.ai_quota ?? null,
      max_patients_per_month: clinic.custom_patient_limit ?? plan?.max_patients_per_month ?? null,
      max_appointments_per_month: clinic.custom_appointment_limit ?? plan?.max_appointments_per_month ?? null,
      max_invoices_per_month: clinic.custom_invoice_limit ?? plan?.max_invoices_per_month ?? null,
      max_treatments_per_month: clinic.custom_treatment_limit ?? plan?.max_treatments_per_month ?? null,
      max_prescriptions_per_month: clinic.custom_prescription_limit ?? plan?.max_prescriptions_per_month ?? null,
      max_consultations_per_month: clinic.custom_consultation_limit ?? plan?.max_consultations_per_month ?? null,
    };
  }

  /**
   * Is one specific feature key effectively enabled for the clinic?
   * Cheap, indexed lookup — used by the FeatureGuard on every request.
   * Expired override rows are ignored.
   */
  async isFeatureEnabled(clinicId: string, featureKey: string): Promise<boolean> {
    const feature = await this.prisma.feature.findUnique({
      where: { key: featureKey },
      select: { id: true },
    });
    if (!feature) return false;

    const override = await this.prisma.clinicFeatureOverride.findUnique({
      where: { clinic_id_feature_id: { clinic_id: clinicId, feature_id: feature.id } },
      select: { is_enabled: true, expires_at: true },
    });
    if (override && (!override.expires_at || override.expires_at > new Date())) {
      return override.is_enabled;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { plan_id: true },
    });
    if (!clinic?.plan_id) return false;

    const planFeature = await this.prisma.planFeature.findUnique({
      where: { plan_id_feature_id: { plan_id: clinic.plan_id, feature_id: feature.id } },
      select: { is_enabled: true },
    });
    return planFeature?.is_enabled ?? false;
  }

  /**
   * Upsert (or remove) per-clinic feature overrides. Pass is_enabled=null
   * (or omit it) to delete the override row and fall back to the plan
   * default. `grantedBySuperAdminId` is stamped on every created/updated
   * row so support can trace who applied each override.
   */
  async upsertOverrides(
    clinicId: string,
    overrides: FeatureOverrideUpsert[],
    grantedBySuperAdminId?: string | null,
  ): Promise<void> {
    if (overrides.length === 0) return;

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });
    if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);

    const featureIds = Array.from(new Set(overrides.map((o) => o.feature_id)));
    const existing = await this.prisma.feature.findMany({
      where: { id: { in: featureIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((f) => f.id));
    const missing = featureIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Features not found: ${missing.join(', ')}`);
    }

    await this.prisma.$transaction(
      overrides.map((o) => {
        // Treat undefined the same as null — both mean "remove the override".
        // The DTO accepts is_enabled?: boolean | null, so callers can omit it.
        const wantsRemove = o.is_enabled === null || o.is_enabled === undefined;
        if (wantsRemove) {
          return this.prisma.clinicFeatureOverride.deleteMany({
            where: { clinic_id: clinicId, feature_id: o.feature_id },
          });
        }
        return this.prisma.clinicFeatureOverride.upsert({
          where: {
            clinic_id_feature_id: { clinic_id: clinicId, feature_id: o.feature_id },
          },
          update: {
            is_enabled: o.is_enabled as boolean,
            reason: o.reason ?? null,
            expires_at: o.expires_at ?? null,
            granted_by_super_admin_id: grantedBySuperAdminId ?? null,
          },
          create: {
            clinic_id: clinicId,
            feature_id: o.feature_id,
            is_enabled: o.is_enabled as boolean,
            reason: o.reason ?? null,
            expires_at: o.expires_at ?? null,
            granted_by_super_admin_id: grantedBySuperAdminId ?? null,
          },
        });
      }),
    );
  }

  /**
   * Resolve the GST-inclusive amount this clinic should be billed for ONE
   * cycle. Returns the per-clinic locked discount when set and unexpired;
   * otherwise the plan default.
   *
   * Storage convention (intentionally different from Plan.price_yearly):
   *   - custom_price_monthly = total INR to charge per monthly cycle
   *   - custom_price_yearly  = total INR to charge per yearly cycle
   * The cron then uses the returned amount as-is — no extra *12.
   *
   * The plan-default branch mirrors the existing renewal cron, where
   * Plan.price_yearly is stored as the per-month-equivalent on yearly billing
   * (so it's multiplied by 12 to get the yearly invoice total).
   *
   * Returns amount=null when the clinic has neither a custom price nor a plan.
   */
  async getEffectivePrice(
    clinicId: string,
    billingCycle: 'monthly' | 'yearly',
  ): Promise<{
    amount: number | null;
    source: 'custom' | 'plan' | 'none';
    custom_price_monthly: number | null;
    custom_price_yearly: number | null;
    custom_expires_at: Date | null;
    custom_reason: string | null;
    plan_amount: number | null;
  }> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        custom_price_monthly: true,
        custom_price_yearly: true,
        custom_price_expires_at: true,
        custom_price_reason: true,
        plan: { select: { price_monthly: true, price_yearly: true } },
      },
    });
    if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);

    const customActive =
      !clinic.custom_price_expires_at || clinic.custom_price_expires_at > new Date();
    const customField =
      billingCycle === 'yearly' ? clinic.custom_price_yearly : clinic.custom_price_monthly;

    const planAmount = clinic.plan
      ? billingCycle === 'yearly'
        ? Number(clinic.plan.price_yearly ?? clinic.plan.price_monthly) * 12
        : Number(clinic.plan.price_monthly)
      : null;

    const customMonthly = clinic.custom_price_monthly != null ? Number(clinic.custom_price_monthly) : null;
    const customYearly = clinic.custom_price_yearly != null ? Number(clinic.custom_price_yearly) : null;

    if (customActive && customField != null) {
      return {
        amount: Number(customField),
        source: 'custom',
        custom_price_monthly: customMonthly,
        custom_price_yearly: customYearly,
        custom_expires_at: clinic.custom_price_expires_at,
        custom_reason: clinic.custom_price_reason,
        plan_amount: planAmount,
      };
    }

    return {
      amount: planAmount,
      source: planAmount != null ? 'plan' : 'none',
      custom_price_monthly: customMonthly,
      custom_price_yearly: customYearly,
      custom_expires_at: clinic.custom_price_expires_at,
      custom_reason: clinic.custom_price_reason,
      plan_amount: planAmount,
    };
  }

  /**
   * Upsert per-clinic price discount. Pass null for both prices to clear
   * the discount. The cron picks up the new value on the next renewal cycle.
   */
  async setCustomPrice(
    clinicId: string,
    input: {
      custom_price_monthly: number | null;
      custom_price_yearly: number | null;
      expires_at: Date | null;
      reason: string | null;
    },
    grantedBySuperAdminId: string,
  ): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });
    if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);

    const clearing =
      input.custom_price_monthly === null && input.custom_price_yearly === null;

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        custom_price_monthly: input.custom_price_monthly,
        custom_price_yearly: input.custom_price_yearly,
        custom_price_expires_at: clearing ? null : input.expires_at,
        custom_price_reason: clearing ? null : input.reason,
        custom_price_granted_by_super_admin_id: clearing ? null : grantedBySuperAdminId,
      },
    });
  }

  async removeOverride(clinicId: string, featureId: string): Promise<void> {
    const result = await this.prisma.clinicFeatureOverride.deleteMany({
      where: { clinic_id: clinicId, feature_id: featureId },
    });
    if (result.count === 0) {
      throw new NotFoundException(
        `No feature override found for clinic ${clinicId} / feature ${featureId}`,
      );
    }
  }

  /**
   * Delete every override whose `expires_at` is in the past. Intended for a
   * nightly cron — but it's also fine to invoke ad-hoc.
   */
  async purgeExpiredOverrides(now: Date = new Date()): Promise<number> {
    const result = await this.prisma.clinicFeatureOverride.deleteMany({
      where: { expires_at: { lt: now } },
    });
    return result.count;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredOverrides(): Promise<void> {
    const deleted = await this.purgeExpiredOverrides();
    if (deleted > 0) {
      this.logger.log(`Purged ${deleted} expired feature override(s)`);
    }
  }
}
