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
  planFeature: {
    findFirst: jest.fn(),
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
    expect(mockPrismaService.clinic.findUnique).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when no user on request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    const context = createMockContext(undefined, undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when clinic has no plan', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ plan_id: null });
    const context = createMockContext({
      userId: 'u1',
      clinicId: 'c1',
      role: 'Admin',
      branchId: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when feature is not in plan', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ plan_id: 'plan-1' });
    mockPrismaService.planFeature.findFirst.mockResolvedValueOnce(null);
    const context = createMockContext({
      userId: 'u1',
      clinicId: 'c1',
      role: 'Admin',
      branchId: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when feature is enabled in plan', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('AI_PRESCRIPTION');
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ plan_id: 'plan-1' });
    mockPrismaService.planFeature.findFirst.mockResolvedValueOnce({
      id: 'pf-1',
      plan_id: 'plan-1',
      feature_id: 'f-1',
      is_enabled: true,
    });
    const context = createMockContext({
      userId: 'u1',
      clinicId: 'c1',
      role: 'Admin',
      branchId: null,
    });

    expect(await guard.canActivate(context)).toBe(true);
  });
});
