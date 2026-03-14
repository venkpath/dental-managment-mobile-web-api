import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from '../common/guards/feature.guard.js';
import { AiUsageGuard } from '../common/guards/ai-usage.guard.js';

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
      planFeature: { findFirst: jest.fn() },
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

  it('should deny access when clinic has no plan assigned', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: null });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access when feature is not in the plan', async () => {
    featureGuard = buildGuard('tooth_chart');
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: planId });
    mockPrisma.planFeature.findFirst.mockResolvedValue(null); // feature not found

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when feature is enabled in the plan', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: planId });
    mockPrisma.planFeature.findFirst.mockResolvedValue({
      plan_id: planId,
      feature_id: 'feat-1',
      is_enabled: true,
    });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    const result = await featureGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.planFeature.findFirst).toHaveBeenCalledWith({
      where: {
        plan_id: planId,
        feature: { key: 'prescriptions' },
        is_enabled: true,
      },
    });
  });

  it('should deny when feature exists but is_enabled is false', async () => {
    featureGuard = buildGuard('inventory');
    mockPrisma.clinic.findUnique.mockResolvedValue({ plan_id: planId });
    // findFirst with is_enabled: true returns null when feature is disabled
    mockPrisma.planFeature.findFirst.mockResolvedValue(null);

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(featureGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny when clinic does not exist', async () => {
    featureGuard = buildGuard('prescriptions');
    mockPrisma.clinic.findUnique.mockResolvedValue(null);

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
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      clinic: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      plan: { findUnique: jest.fn() },
      planFeature: { findFirst: jest.fn() },
    };
  });

  function buildGuard(trackUsage: boolean | undefined) {
    const reflector = createMockReflector(trackUsage);
    return new AiUsageGuard(reflector, mockPrisma);
  }

  it('should skip tracking when @TrackAiUsage is not set', async () => {
    aiUsageGuard = buildGuard(undefined);
    const ctx = createMockExecutionContext({ user: { userId, clinicId, role: 'dentist' } });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.clinic.findUnique).not.toHaveBeenCalled();
  });

  it('should allow super admin to bypass AI tracking', async () => {
    aiUsageGuard = buildGuard(true);
    const ctx = createMockExecutionContext({ superAdmin: { id: 'sa-1' } });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.clinic.findUnique).not.toHaveBeenCalled();
  });

  it('should deny when user is not authenticated', async () => {
    aiUsageGuard = buildGuard(true);
    const ctx = createMockExecutionContext({});
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny when clinic has no plan', async () => {
    aiUsageGuard = buildGuard(true);
    mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, plan_id: null });

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny when plan does not exist', async () => {
    aiUsageGuard = buildGuard(true);
    mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, plan_id: planId });
    mockPrisma.plan.findUnique.mockResolvedValue(null);

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow and increment when under quota', async () => {
    aiUsageGuard = buildGuard(true);
    mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, plan_id: planId });
    mockPrisma.plan.findUnique.mockResolvedValue({ ai_quota: 100 });
    mockPrisma.clinic.updateMany.mockResolvedValue({ count: 1 }); // atomic increment succeeded

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.clinic.updateMany).toHaveBeenCalledWith({
      where: {
        id: clinicId,
        ai_usage_count: { lt: 100 },
      },
      data: { ai_usage_count: { increment: 1 } },
    });
  });

  it('should deny when AI quota is exhausted (atomic check)', async () => {
    aiUsageGuard = buildGuard(true);
    mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, plan_id: planId });
    mockPrisma.plan.findUnique.mockResolvedValue({ ai_quota: 50 });
    mockPrisma.clinic.updateMany.mockResolvedValue({ count: 0 }); // quota exceeded

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    await expect(aiUsageGuard.canActivate(ctx)).rejects.toThrow(
      'AI usage quota exceeded for your current plan',
    );
  });

  it('should allow unlimited usage when ai_quota is 0', async () => {
    aiUsageGuard = buildGuard(true);
    mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, plan_id: planId });
    mockPrisma.plan.findUnique.mockResolvedValue({ ai_quota: 0 }); // unlimited

    const ctx = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    const result = await aiUsageGuard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockPrisma.clinic.update).toHaveBeenCalledWith({
      where: { id: clinicId },
      data: { ai_usage_count: { increment: 1 } },
    });
    // Should NOT use updateMany (quota check) when unlimited
    expect(mockPrisma.clinic.updateMany).not.toHaveBeenCalled();
  });

  it('should handle concurrent requests with atomic quota enforcement', async () => {
    aiUsageGuard = buildGuard(true);
    mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, plan_id: planId });
    mockPrisma.plan.findUnique.mockResolvedValue({ ai_quota: 1 });

    // First request succeeds, second fails (simulating race condition)
    mockPrisma.clinic.updateMany
      .mockResolvedValueOnce({ count: 1 }) // first request gets the last slot
      .mockResolvedValueOnce({ count: 0 }); // second request - quota now full

    const ctx1 = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });
    const ctx2 = createMockExecutionContext({
      user: { userId, clinicId, role: 'dentist' },
    });

    const result1 = await aiUsageGuard.canActivate(ctx1);
    expect(result1).toBe(true);

    await expect(aiUsageGuard.canActivate(ctx2)).rejects.toThrow(ForbiddenException);
  });
});
