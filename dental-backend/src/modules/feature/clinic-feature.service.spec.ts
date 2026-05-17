import { NotFoundException } from '@nestjs/common';
import { ClinicFeatureService } from './clinic-feature.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const makePrismaMock = () => ({
  clinic: { findUnique: jest.fn(), update: jest.fn() },
  feature: { findMany: jest.fn(), findUnique: jest.fn() },
  planFeature: { findMany: jest.fn(), findUnique: jest.fn() },
  clinicFeatureOverride: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
});

describe('ClinicFeatureService', () => {
  let service: ClinicFeatureService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ClinicFeatureService(prisma as unknown as PrismaService);
  });

  describe('getEffectiveFeatures', () => {
    const features = [
      { id: 'f-1', key: 'AI_PRESCRIPTION', description: 'AI prescription' },
      { id: 'f-2', key: 'BULK_SMS', description: 'Bulk SMS' },
      { id: 'f-3', key: 'TREATMENT_PLAN', description: 'Treatment plan builder' },
    ];

    it('returns plan defaults when no overrides exist', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1', plan_id: 'plan-1' });
      prisma.feature.findMany.mockResolvedValueOnce(features);
      prisma.planFeature.findMany.mockResolvedValueOnce([
        { feature_id: 'f-1', is_enabled: true },
        { feature_id: 'f-2', is_enabled: false },
      ]);
      prisma.clinicFeatureOverride.findMany.mockResolvedValueOnce([]);

      const rows = await service.getEffectiveFeatures('c-1');
      expect(rows.find((r) => r.key === 'AI_PRESCRIPTION')).toMatchObject({
        is_enabled: true,
        source: 'plan',
        redundant_with_plan: false,
      });
      expect(rows.find((r) => r.key === 'BULK_SMS')).toMatchObject({
        is_enabled: false,
        source: 'plan',
      });
      expect(rows.find((r) => r.key === 'TREATMENT_PLAN')).toMatchObject({
        is_enabled: false,
        source: 'none',
      });
    });

    it('override grants on top of plan absence', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1', plan_id: 'plan-1' });
      prisma.feature.findMany.mockResolvedValueOnce(features);
      prisma.planFeature.findMany.mockResolvedValueOnce([]);
      prisma.clinicFeatureOverride.findMany.mockResolvedValueOnce([
        {
          feature_id: 'f-1',
          is_enabled: true,
          reason: 'support comp',
          granted_by_super_admin_id: 'sa-1',
          expires_at: null,
        },
      ]);

      const rows = await service.getEffectiveFeatures('c-1');
      const ai = rows.find((r) => r.key === 'AI_PRESCRIPTION')!;
      expect(ai).toMatchObject({
        is_enabled: true,
        source: 'override',
        reason: 'support comp',
        granted_by_super_admin_id: 'sa-1',
        expires_at: null,
        redundant_with_plan: false,
      });
    });

    it('override revokes a plan-included feature', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1', plan_id: 'plan-1' });
      prisma.feature.findMany.mockResolvedValueOnce(features);
      prisma.planFeature.findMany.mockResolvedValueOnce([
        { feature_id: 'f-1', is_enabled: true },
      ]);
      prisma.clinicFeatureOverride.findMany.mockResolvedValueOnce([
        { feature_id: 'f-1', is_enabled: false, reason: null, granted_by_super_admin_id: null, expires_at: null },
      ]);

      const rows = await service.getEffectiveFeatures('c-1');
      const ai = rows.find((r) => r.key === 'AI_PRESCRIPTION')!;
      expect(ai.is_enabled).toBe(false);
      expect(ai.source).toBe('override');
      expect(ai.plan_enabled).toBe(true);
      expect(ai.override_enabled).toBe(false);
      expect(ai.redundant_with_plan).toBe(false);
    });

    it('flags redundant_with_plan when override matches plan default', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1', plan_id: 'plan-1' });
      prisma.feature.findMany.mockResolvedValueOnce(features);
      prisma.planFeature.findMany.mockResolvedValueOnce([
        { feature_id: 'f-1', is_enabled: true },
      ]);
      prisma.clinicFeatureOverride.findMany.mockResolvedValueOnce([
        { feature_id: 'f-1', is_enabled: true, reason: null, granted_by_super_admin_id: null, expires_at: null },
      ]);

      const rows = await service.getEffectiveFeatures('c-1');
      const ai = rows.find((r) => r.key === 'AI_PRESCRIPTION')!;
      expect(ai.redundant_with_plan).toBe(true);
    });

    it('treats expired overrides as if they did not exist', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1', plan_id: 'plan-1' });
      prisma.feature.findMany.mockResolvedValueOnce(features);
      prisma.planFeature.findMany.mockResolvedValueOnce([
        { feature_id: 'f-1', is_enabled: false },
      ]);
      prisma.clinicFeatureOverride.findMany.mockResolvedValueOnce([
        {
          feature_id: 'f-1',
          is_enabled: true,
          reason: 'trial extension',
          granted_by_super_admin_id: 'sa-1',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        },
      ]);

      const rows = await service.getEffectiveFeatures('c-1');
      const ai = rows.find((r) => r.key === 'AI_PRESCRIPTION')!;
      expect(ai.is_enabled).toBe(false);
      expect(ai.source).toBe('plan');
      expect(ai.reason).toBeNull();
      expect(ai.expires_at).toBeNull();
    });

    it('throws when clinic does not exist', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.getEffectiveFeatures('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEffectiveLimits', () => {
    it('clinic.custom_* values win over plan defaults', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_max_branches: 5,
        custom_max_staff: null,
        ai_quota_override: 2000,
        custom_patient_limit: null,
        custom_appointment_limit: null,
        custom_invoice_limit: null,
        custom_treatment_limit: null,
        custom_prescription_limit: null,
        custom_consultation_limit: null,
        plan: {
          max_branches: 1,
          max_staff: 5,
          ai_quota: 100,
          max_patients_per_month: 50,
          max_appointments_per_month: 50,
          max_invoices_per_month: 50,
          max_treatments_per_month: 50,
          max_prescriptions_per_month: 50,
          max_consultations_per_month: 50,
        },
      });

      const limits = await service.getEffectiveLimits('c-1');
      expect(limits.max_branches).toBe(5); // override wins
      expect(limits.max_staff).toBe(5); // plan default
      expect(limits.ai_quota).toBe(2000); // override wins
      expect(limits.max_patients_per_month).toBe(50); // plan default
    });

    it('returns null for unlimited (plan null + no override)', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_max_branches: null,
        custom_max_staff: null,
        ai_quota_override: null,
        custom_patient_limit: null,
        custom_appointment_limit: null,
        custom_invoice_limit: null,
        custom_treatment_limit: null,
        custom_prescription_limit: null,
        custom_consultation_limit: null,
        plan: {
          max_branches: 1,
          max_staff: 5,
          ai_quota: 0,
          max_patients_per_month: null,
          max_appointments_per_month: null,
          max_invoices_per_month: null,
          max_treatments_per_month: null,
          max_prescriptions_per_month: null,
          max_consultations_per_month: null,
        },
      });
      const limits = await service.getEffectiveLimits('c-1');
      expect(limits.max_patients_per_month).toBeNull();
    });

    it('throws when clinic does not exist', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.getEffectiveLimits('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true when override grants the feature', async () => {
      prisma.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
      prisma.clinicFeatureOverride.findUnique.mockResolvedValueOnce({ is_enabled: true, expires_at: null });
      expect(await service.isFeatureEnabled('c-1', 'AI_PRESCRIPTION')).toBe(true);
    });

    it('returns false when override revokes the feature', async () => {
      prisma.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
      prisma.clinicFeatureOverride.findUnique.mockResolvedValueOnce({ is_enabled: false, expires_at: null });
      expect(await service.isFeatureEnabled('c-1', 'AI_PRESCRIPTION')).toBe(false);
    });

    it('ignores expired overrides and falls back to plan', async () => {
      prisma.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
      prisma.clinicFeatureOverride.findUnique.mockResolvedValueOnce({
        is_enabled: true,
        expires_at: new Date(Date.now() - 1000),
      });
      prisma.clinic.findUnique.mockResolvedValueOnce({ plan_id: 'plan-1' });
      prisma.planFeature.findUnique.mockResolvedValueOnce({ is_enabled: false });
      expect(await service.isFeatureEnabled('c-1', 'AI_PRESCRIPTION')).toBe(false);
    });

    it('falls back to plan when no override exists', async () => {
      prisma.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
      prisma.clinicFeatureOverride.findUnique.mockResolvedValueOnce(null);
      prisma.clinic.findUnique.mockResolvedValueOnce({ plan_id: 'plan-1' });
      prisma.planFeature.findUnique.mockResolvedValueOnce({ is_enabled: true });
      expect(await service.isFeatureEnabled('c-1', 'AI_PRESCRIPTION')).toBe(true);
    });

    it('returns false when feature key is unknown', async () => {
      prisma.feature.findUnique.mockResolvedValueOnce(null);
      expect(await service.isFeatureEnabled('c-1', 'BOGUS')).toBe(false);
    });
  });

  describe('upsertOverrides', () => {
    it('creates/updates rows and deletes when is_enabled is null', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1' });
      prisma.feature.findMany.mockResolvedValueOnce([{ id: 'f-1' }, { id: 'f-2' }]);

      await service.upsertOverrides('c-1', [
        { feature_id: 'f-1', is_enabled: true, reason: 'support comp' },
        { feature_id: 'f-2', is_enabled: null },
      ], 'sa-1');

      expect(prisma.clinicFeatureOverride.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.clinicFeatureOverride.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            is_enabled: true,
            reason: 'support comp',
            granted_by_super_admin_id: 'sa-1',
          }),
          update: expect.objectContaining({
            is_enabled: true,
            reason: 'support comp',
            granted_by_super_admin_id: 'sa-1',
          }),
        }),
      );
      expect(prisma.clinicFeatureOverride.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.clinicFeatureOverride.deleteMany).toHaveBeenCalledWith({
        where: { clinic_id: 'c-1', feature_id: 'f-2' },
      });
    });

    it('treats undefined is_enabled the same as null (removes row)', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1' });
      prisma.feature.findMany.mockResolvedValueOnce([{ id: 'f-1' }]);

      await service.upsertOverrides('c-1', [{ feature_id: 'f-1' } as never]);

      expect(prisma.clinicFeatureOverride.upsert).not.toHaveBeenCalled();
      expect(prisma.clinicFeatureOverride.deleteMany).toHaveBeenCalledWith({
        where: { clinic_id: 'c-1', feature_id: 'f-1' },
      });
    });

    it('throws when feature id is unknown', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1' });
      prisma.feature.findMany.mockResolvedValueOnce([]);
      await expect(
        service.upsertOverrides('c-1', [{ feature_id: 'f-x', is_enabled: true }]),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when clinic does not exist', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.upsertOverrides('missing', [{ feature_id: 'f-1', is_enabled: true }]),
      ).rejects.toThrow(NotFoundException);
    });

    it('no-ops on empty overrides array', async () => {
      await service.upsertOverrides('c-1', []);
      expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getEffectivePrice', () => {
    it('returns custom price when set and not expired', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_price_monthly: 6999,
        custom_price_yearly: 69990,
        custom_price_expires_at: null,
        custom_price_reason: 'launch promo',
        plan: { price_monthly: 9999, price_yearly: null },
      });
      const result = await service.getEffectivePrice('c-1', 'monthly');
      expect(result.amount).toBe(6999);
      expect(result.source).toBe('custom');
      expect(result.custom_reason).toBe('launch promo');
      expect(result.plan_amount).toBe(9999);
    });

    it('returns custom yearly price for yearly billing cycle', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_price_monthly: 6999,
        custom_price_yearly: 69990,
        custom_price_expires_at: null,
        custom_price_reason: null,
        plan: { price_monthly: 9999, price_yearly: null },
      });
      const result = await service.getEffectivePrice('c-1', 'yearly');
      expect(result.amount).toBe(69990);
      expect(result.source).toBe('custom');
    });

    it('falls through to plan when only monthly custom is set on yearly billing', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_price_monthly: 6999,
        custom_price_yearly: null,
        custom_price_expires_at: null,
        custom_price_reason: null,
        plan: { price_monthly: 9999, price_yearly: null },
      });
      const result = await service.getEffectivePrice('c-1', 'yearly');
      // Plan path: yearly fallback = price_monthly * 12 = 9999 * 12
      expect(result.amount).toBe(9999 * 12);
      expect(result.source).toBe('plan');
    });

    it('returns plan default when custom price has expired', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_price_monthly: 6999,
        custom_price_yearly: null,
        custom_price_expires_at: new Date(Date.now() - 60_000), // 1 min ago
        custom_price_reason: 'expired promo',
        plan: { price_monthly: 9999, price_yearly: null },
      });
      const result = await service.getEffectivePrice('c-1', 'monthly');
      expect(result.amount).toBe(9999);
      expect(result.source).toBe('plan');
    });

    it('returns plan amount when no custom price is set', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_price_monthly: null,
        custom_price_yearly: null,
        custom_price_expires_at: null,
        custom_price_reason: null,
        plan: { price_monthly: 9999, price_yearly: null },
      });
      const result = await service.getEffectivePrice('c-1', 'monthly');
      expect(result.amount).toBe(9999);
      expect(result.source).toBe('plan');
    });

    it('returns amount=null and source=none when no plan and no custom price', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({
        custom_price_monthly: null,
        custom_price_yearly: null,
        custom_price_expires_at: null,
        custom_price_reason: null,
        plan: null,
      });
      const result = await service.getEffectivePrice('c-1', 'monthly');
      expect(result.amount).toBeNull();
      expect(result.source).toBe('none');
    });

    it('throws when clinic does not exist', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.getEffectivePrice('missing', 'monthly')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCustomPrice', () => {
    it('stamps audit fields when discount is set', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1' });
      const expires = new Date('2027-01-01');
      await service.setCustomPrice(
        'c-1',
        {
          custom_price_monthly: 6999,
          custom_price_yearly: 69990,
          expires_at: expires,
          reason: 'launch promo',
        },
        'sa-1',
      );
      expect(prisma.clinic.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: {
          custom_price_monthly: 6999,
          custom_price_yearly: 69990,
          custom_price_expires_at: expires,
          custom_price_reason: 'launch promo',
          custom_price_granted_by_super_admin_id: 'sa-1',
        },
      });
    });

    it('clears all audit fields when both prices are null', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'c-1' });
      await service.setCustomPrice(
        'c-1',
        {
          custom_price_monthly: null,
          custom_price_yearly: null,
          expires_at: new Date('2027-01-01'),
          reason: 'irrelevant',
        },
        'sa-1',
      );
      expect(prisma.clinic.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: {
          custom_price_monthly: null,
          custom_price_yearly: null,
          custom_price_expires_at: null,
          custom_price_reason: null,
          custom_price_granted_by_super_admin_id: null,
        },
      });
    });

    it('throws when clinic does not exist', async () => {
      prisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.setCustomPrice(
          'missing',
          { custom_price_monthly: 6999, custom_price_yearly: null, expires_at: null, reason: null },
          'sa-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('purgeExpiredOverrides', () => {
    it('deletes rows whose expires_at is in the past', async () => {
      prisma.clinicFeatureOverride.deleteMany.mockResolvedValueOnce({ count: 3 });
      const count = await service.purgeExpiredOverrides();
      expect(count).toBe(3);
      expect(prisma.clinicFeatureOverride.deleteMany).toHaveBeenCalledWith({
        where: { expires_at: { lt: expect.any(Date) } },
      });
    });
  });
});
