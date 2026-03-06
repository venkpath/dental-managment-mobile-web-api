import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../../modules/user/dto/create-user.dto.js';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

function createMockContext(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(mockReflector as unknown as Reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ role: 'Dentist' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext({ role: 'Dentist' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.DENTIST]);
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Dentist', branchId: null });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user has wrong role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext({ userId: 'u1', clinicId: 'c1', role: 'Receptionist', branchId: null });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not set', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
