import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SuperAdminGuard } from './super-admin.guard.js';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

function createMockContext(superAdmin?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ superAdmin }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  beforeEach(() => {
    guard = new SuperAdminGuard(mockReflector as unknown as Reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when @SuperAdmin() is not set', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when request has superAdmin', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext({ id: 'admin-123' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when @SuperAdmin() is set but no superAdmin on request', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
