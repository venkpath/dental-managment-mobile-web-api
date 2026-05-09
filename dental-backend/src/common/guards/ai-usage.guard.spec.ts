import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiUsageGuard } from './ai-usage.guard.js';
import { AiUsageService } from '../../modules/ai/ai-usage.service.js';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockAiUsageService = {
  reserveSlot: jest.fn(),
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
      mockAiUsageService as unknown as AiUsageService,
    );
    jest.clearAllMocks();
    mockAiUsageService.reserveSlot.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when @TrackAiUsage is not set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockAiUsageService.reserveSlot).not.toHaveBeenCalled();
  });

  it('should allow access for super admins', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext(undefined, { id: 'admin-123' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockAiUsageService.reserveSlot).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when no user on request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext(undefined, undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when quota exceeded', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    mockAiUsageService.reserveSlot.mockRejectedValueOnce(
      new ForbiddenException('AI quota exceeded'),
    );
    const context = createMockContext({ clinicId: 'c1', userId: 'u1', role: 'Admin' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow and call reserveSlot when within quota', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext({ clinicId: 'c1', userId: 'u1', role: 'Admin' });

    expect(await guard.canActivate(context)).toBe(true);
    expect(mockAiUsageService.reserveSlot).toHaveBeenCalledWith('c1');
  });
});
