import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard.js';
import { PrismaService } from '../../database/prisma.service.js';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockPrismaService = {
  clinic: {
    findUnique: jest.fn(),
  },
  feature: {
    findUnique: jest.fn(),
  },
  planFeature: {
    findUnique: jest.fn(),
  },
  clinicFeatureOverride: {
    findUnique: jest.fn(),
  },
};

function createMockContext(
  user?: Record<string, unknown>,
  superAdmin?: Record<string, unknown>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, superAdmin }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('FeatureGuard', () => {
  let guard: FeatureGuard;

  beforeEach(() => {
    guard = new FeatureGuard(
      mockReflector as unknown as Reflector,
      mockPrismaService as unknown as PrismaService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when @RequireFeature is not set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access for super admins', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    const context = createMockContext(undefined, { id: 'admin-123' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockPrismaService.feature.findUnique).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when no user on request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    const context = createMockContext(undefined, undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when feature key does not exist', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('UNKNOWN_FEATURE');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce(null);
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when clinic has no plan and no override', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
    mockPrismaService.clinicFeatureOverride.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ plan_id: null });
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when feature is not in plan and no override', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
    mockPrismaService.clinicFeatureOverride.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ plan_id: 'plan-1' });
    mockPrismaService.planFeature.findUnique.mockResolvedValueOnce(null);
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when feature is enabled in plan and no override', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
    mockPrismaService.clinicFeatureOverride.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ plan_id: 'plan-1' });
    mockPrismaService.planFeature.findUnique.mockResolvedValueOnce({ is_enabled: true });
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access when override grants a feature missing from plan', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
    mockPrismaService.clinicFeatureOverride.findUnique.mockResolvedValueOnce({ is_enabled: true, expires_at: null });
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    expect(await guard.canActivate(context)).toBe(true);
    // Plan lookup is short-circuited by the override.
    expect(mockPrismaService.planFeature.findUnique).not.toHaveBeenCalled();
  });

  it('should deny access when override disables a feature included in plan', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
    mockPrismaService.clinicFeatureOverride.findUnique.mockResolvedValueOnce({ is_enabled: false, expires_at: null });
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(mockPrismaService.planFeature.findUnique).not.toHaveBeenCalled();
  });

  it('should treat expired overrides as absent and fall back to plan', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
    mockPrismaService.clinicFeatureOverride.findUnique.mockResolvedValueOnce({
      is_enabled: true,
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ plan_id: 'plan-1' });
    mockPrismaService.planFeature.findUnique.mockResolvedValueOnce({ is_enabled: true });
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockPrismaService.clinic.findUnique).toHaveBeenCalled();
    expect(mockPrismaService.planFeature.findUnique).toHaveBeenCalled();
  });

  it('should honor unexpired override (future expires_at)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.feature.findUnique.mockResolvedValueOnce({ id: 'f-1' });
    mockPrismaService.clinicFeatureOverride.findUnique.mockResolvedValueOnce({
      is_enabled: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockPrismaService.planFeature.findUnique).not.toHaveBeenCalled();
  });
});
