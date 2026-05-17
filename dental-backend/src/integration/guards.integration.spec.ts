import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from '../common/guards/feature.guard.js';
import { AiUsageGuard } from '../common/guards/ai-usage.guard.js';
import { AiUsageService } from '../modules/ai/ai-usage.service.js';

/**
 * Integration Tests: Feature Guard & AI Quota Enforcement
 *
 * Tests the guard layer that enforces plan-based feature gating
 * and AI usage quota tracking.
 */

const clinicId = '11111111-1111-1111-1111-111111111111';
const planId = 'plan1111-2222-3333-4444-555555555555';
const userId = 'user1111-2222-3333-4444-555555555555';

function createMockExecutionContext(overrides: {
  user?: any;
  superAdmin?: any;
  featureKey?: string;
  trackAiUsage?: boolean;
}): ExecutionContext {
  const request = {
    user: overrides.user,
    superAdmin: overrides.superAdmin,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function createMockReflector(returnValue: any): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(returnValue),
  } as any;
}

// ==========================================
// Feature Guard Integration Tests
// ==========================================
describe('Integration: Feature Guard Enforcement', () => {
  let featureGuard: FeatureGuard;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      clinic: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      feature: { findUnique: jest.fn() },
      planFeature: { findUnique: jest.fn() },
      clinicFeatureOverride: { findUnique: jest.fn() },
      plan: { findUnique: jest.fn() },
    };
  });

  function buildGuard(featureKey: string | undefined) {
    const reflector = createMockReflector(featureKey);
    return new FeatureGuard(reflector, mockPrisma);
  }

  it('should allow access when no feature key is required', async () => {
    featureGuard = buildGuard(undefined);
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    const result = await featureGuard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should allow super admin to bypass feature check', async () => {
    featureGuard = buildGuard('prescriptions');
    const ctx = createMockExecutionContext({ superAdmin: { id: 'sa-1' } });
    const result = await featureGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.clinic.findUnique).not.toHaveBeenCalled();
  });

  it('should deny access when user has no authentication', async () => {
    featureGuard = buildGuard('prescriptions');
    const ctx = createMockExecutionContext({});
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access when clinic has no plan assigned and no override', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue(null);
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: null });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access when feature is not in the plan and no override', async () => {
    featureGuard = buildGuard('tooth_chart');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue(null);
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: planId });
    mockPrisma.planFeature.findUnique.mockResolvedValue(null);

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when feature is enabled in the plan and no override', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue(null);
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: planId });
    mockPrisma.planFeature.findUnique.mockResolvedValue({ is_enabled: true });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    const result = await featureGuard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should deny when feature exists but is_enabled is false in plan', async () => {
    featureGuard = buildGuard('inventory');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue(null);
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: planId });
    mockPrisma.planFeature.findUnique.mockResolvedValue({ is_enabled: false });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow when override grants a feature not in the plan', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue({ is_enabled: true, expires_at: null });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    const result = await featureGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.planFeature.findUnique).not.toHaveBeenCalled();
  });

  it('should deny when override revokes a feature included in plan', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue({ is_enabled: false, expires_at: null });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.planFeature.findUnique).not.toHaveBeenCalled();
  });

  it('should fall back to plan when override is expired', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue({
      is_enabled: false,
      expires_at: new Date(Date.now() - 60_000),
    });
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: planId });
    mockPrisma.planFeature.findUnique.mockResolvedValue({ is_enabled: true });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    expect(await featureGuard.canActivate(ctx)).toBe(true);
  });

  it('should deny when clinic does not exist (plan fallback path)', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.feature.findUnique.mockResolvedValue({ id: 'feat-1' });
    mockPrisma.clinicFeatureOverride.findUnique.mockResolvedValue(null);
    mockPrisma.clinic.findUnique.mockResolvedValue(null);

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny when feature key does not exist in registry', async () => {
    featureGuard = buildGuard('bogus_feature');
    mockPrisma.feature.findUnique.mockResolvedValue(null);

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});

// ==========================================
// AI Quota Enforcement Integration Tests
// ==========================================
describe('Integration: AI Quota Enforcement', () => {
  let aiUsageGuard: AiUsageGuard;
  let mockAiUsageService: { reserveSlot: jest.Mock };

  beforeEach(() => {
    mockAiUsageService = { reserveSlot: jest.fn().mockResolvedValue(undefined) };
  });

  function buildGuard(trackUsage: boolean | undefined) {
    const reflector = createMockReflector(trackUsage);
    return new AiUsageGuard(reflector, mockAiUsageService as unknown as AiUsageService);
  }

  it('should skip tracking when @TrackAiUsage is not set', async () => {
    aiUsageGuard = buildGuard(undefined);
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockAiUsageService.reserveSlot).not.toHaveBeenCalled();
  });

  it('should allow super admin to bypass AI tracking', async () => {
    aiUsageGuard = buildGuard(true);
    const ctx = createMockExecutionContext({ superAdmin: { id: 'sa-1' } });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockAiUsageService.reserveSlot).not.toHaveBeenCalled();
  });

  it('should deny when user is not authenticated', async () => {
    aiUsageGuard = buildGuard(true);
    const ctx = createMockExecutionContext({});
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny when clinic has no plan', async () => {
    aiUsageGuard = buildGuard(true);
    mockAiUsageService.reserveSlot.mockRejectedValueOnce(
      new ForbiddenException('Clinic has no active plan'),
    );
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny when plan does not exist', async () => {
    aiUsageGuard = buildGuard(true);
    mockAiUsageService.reserveSlot.mockRejectedValueOnce(
      new ForbiddenException('Plan not found'),
    );
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow and increment when under quota', async () => {
    aiUsageGuard = buildGuard(true);
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockAiUsageService.reserveSlot).toHaveBeenCalledWith(clinicId);
  });

  it('should deny when AI quota is exhausted (atomic check)', async () => {
    aiUsageGuard = buildGuard(true);
    mockAiUsageService.reserveSlot.mockRejectedValueOnce(
      new ForbiddenException('AI usage quota exceeded for your current plan'),
    );
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(
      'AI usage quota exceeded for your current plan',
    );
  });

  it('should allow unlimited usage when ai_quota is 0', async () => {
    aiUsageGuard = buildGuard(true);
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockAiUsageService.reserveSlot).toHaveBeenCalledWith(clinicId);
  });

  it('should handle concurrent requests with atomic quota enforcement', async () => {
    aiUsageGuard = buildGuard(true);

    // First request succeeds, second fails (simulating race condition)
    mockAiUsageService.reserveSlot
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ForbiddenException('AI quota exhausted'));

    const ctx1 = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    const ctx2 = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });

    expect(await aiUsageGuard.canActivate(ctx1)).toBe(true);
    await expect(aiUsageGuard.canActivate(ctx2)).rejects.toThrow(ForbiddenException);
  });
});
