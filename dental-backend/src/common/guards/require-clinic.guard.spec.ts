import { ExecutionContext, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RequireClinicGuard } from './require-clinic.guard.js';

function createMockContext(
  clinicId?: string,
  user?: { userId: string; clinicId: string; role: string; branchId: string | null },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ clinicId, user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RequireClinicGuard', () => {
  const guard = new RequireClinicGuard();

  it('should allow when clinicId is present and no user (public)', () => {
    const ctx = createMockContext('123e4567-e89b-12d3-a456-426614174000');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow when clinicId matches JWT clinic_id', () => {
    const clinicId = '123e4567-e89b-12d3-a456-426614174000';
    const user = { userId: 'u1', clinicId, role: 'Dentist', branchId: null };
    const ctx = createMockContext(clinicId, user);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when clinicId does not match JWT clinic_id', () => {
    const user = { userId: 'u1', clinicId: 'clinic-a', role: 'Dentist', branchId: null };
    const ctx = createMockContext('clinic-b', user);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw BadRequestException when clinicId is missing', () => {
    const ctx = createMockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(BadRequestException);
  });
});
