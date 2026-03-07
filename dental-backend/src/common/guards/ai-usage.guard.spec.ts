import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiUsageGuard } from './ai-usage.guard.js';
import { PrismaService } from '../../database/prisma.service.js';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockPrismaService = {
  clinic: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  plan: {
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

describe('AiUsageGuard', () => {
  let guard: AiUsageGuard;

  beforeEach(() => {
    guard = new AiUsageGuard(
      mockReflector as unknown as Reflector,
      mockPrismaService as unknown as PrismaService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when @TrackAiUsage is not set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access for super admins', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext(undefined, { id: 'admin-123' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockPrismaService.clinic.findUnique).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when no user on request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext(undefined, undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when clinic has no plan', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({
      id: 'c1',
      plan_id: null,
    });
    const context = createMockContext({
      userId: 'u1',
      clinicId: 'c1',
      role: 'Admin',
      branchId: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when quota exceeded (atomic check)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({
      id: 'c1',
      plan_id: 'plan-1',
    });
    mockPrismaService.plan.findUnique.mockResolvedValueOnce({ ai_quota: 100 });
    mockPrismaService.clinic.updateMany.mockResolvedValueOnce({ count: 0 });
    const context = createMockContext({
      userId: 'u1',
      clinicId: 'c1',
      role: 'Admin',
      branchId: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow and increment atomically when within quota', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({
      id: 'c1',
      plan_id: 'plan-1',
    });
    mockPrismaService.plan.findUnique.mockResolvedValueOnce({ ai_quota: 100 });
    mockPrismaService.clinic.updateMany.mockResolvedValueOnce({ count: 1 });
    const context = createMockContext({
      userId: 'u1',
      clinicId: 'c1',
      role: 'Admin',
      branchId: null,
    });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockPrismaService.clinic.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', ai_usage_count: { lt: 100 } },
      data: { ai_usage_count: { increment: 1 } },
    });
  });

  it('should allow unlimited usage when ai_quota is 0', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockPrismaService.clinic.findUnique.mockResolvedValueOnce({
      id: 'c1',
      plan_id: 'plan-1',
    });
    mockPrismaService.plan.findUnique.mockResolvedValueOnce({ ai_quota: 0 });
    mockPrismaService.clinic.update.mockResolvedValueOnce({});
    const context = createMockContext({
      userId: 'u1',
      clinicId: 'c1',
      role: 'Admin',
      branchId: null,
    });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockPrismaService.clinic.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { ai_usage_count: { increment: 1 } },
    });
  });
});
