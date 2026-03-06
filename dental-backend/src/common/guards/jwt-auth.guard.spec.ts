import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const mockJwtService = {
  verifyAsync: jest.fn(),
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

function createMockContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = { headers, user: undefined, superAdmin: undefined } as Record<string, unknown>;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(
      mockJwtService as unknown as JwtService,
      mockReflector as unknown as Reflector,
    );
    jest.clearAllMocks();
    mockReflector.getAllAndOverride.mockReturnValue(false);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access for @Public() routes', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when no token provided', async () => {
    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when Authorization header has wrong format', async () => {
    const context = createMockContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token is invalid', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    const context = createMockContext({ authorization: 'Bearer invalid.token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should attach user to request on valid user token', async () => {
    const payload = {
      sub: 'user-id-123',
      type: 'user',
      clinic_id: 'clinic-id-456',
      role: 'Dentist',
      branch_id: 'branch-id-789',
    };
    mockJwtService.verifyAsync.mockResolvedValue(payload);
    const context = createMockContext({ authorization: 'Bearer valid.jwt.token' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    expect(request['user']).toEqual({
      userId: 'user-id-123',
      clinicId: 'clinic-id-456',
      role: 'Dentist',
      branchId: 'branch-id-789',
    });
  });

  it('should attach superAdmin to request on valid super_admin token', async () => {
    const payload = {
      sub: 'admin-id-123',
      type: 'super_admin',
    };
    mockJwtService.verifyAsync.mockResolvedValue(payload);
    const context = createMockContext({ authorization: 'Bearer valid.jwt.token' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    expect(request['superAdmin']).toEqual({ id: 'admin-id-123' });
    expect(request['user']).toBeUndefined();
  });

  it('should extract Bearer token correctly', async () => {
    const payload = { sub: 'u1', type: 'user', clinic_id: 'c1', role: 'Admin', branch_id: null };
    mockJwtService.verifyAsync.mockResolvedValue(payload);
    const context = createMockContext({ authorization: 'Bearer my.jwt.token' });

    await guard.canActivate(context);

    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('my.jwt.token');
  });
});
