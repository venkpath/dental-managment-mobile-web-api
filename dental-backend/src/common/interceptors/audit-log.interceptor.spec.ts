import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { AuditLogService } from '../../modules/audit-log/audit-log.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const userId = 'ddd44444-eeee-ffff-0000-111111111111';
const entityId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';

const mockAuditLogService = {
  log: jest.fn().mockResolvedValue({}),
};

function createMockContext(method: string, path: string, withClinic = true, withUser = true): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        clinicId: withClinic ? clinicId : undefined,
        user: withUser ? { userId } : undefined,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

const mockCallHandler: CallHandler = {
  handle: () => of({ id: entityId, name: 'Test' }),
};

const emptyCallHandler: CallHandler = {
  handle: () => of(null),
};

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    interceptor = new AuditLogInterceptor(
      mockAuditLogService as unknown as AuditLogService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log create action on POST requests', (done) => {
    const context = createMockContext('POST', '/patients');
    interceptor.intercept(context, mockCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).toHaveBeenCalledWith({
            clinic_id: clinicId,
            user_id: userId,
            action: 'create',
            entity: 'patients',
            entity_id: entityId,
          });
          done();
        }, 10);
      },
    });
  });

  it('should log update action on PATCH requests', (done) => {
    const context = createMockContext('PATCH', `/patients/${entityId}`);
    interceptor.intercept(context, mockCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'update', entity: 'patients' }),
          );
          done();
        }, 10);
      },
    });
  });

  it('should log delete action on DELETE requests', (done) => {
    const context = createMockContext('DELETE', `/patients/${entityId}`);
    interceptor.intercept(context, mockCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'delete', entity: 'patients' }),
          );
          done();
        }, 10);
      },
    });
  });

  it('should skip GET requests', (done) => {
    const context = createMockContext('GET', '/patients');
    interceptor.intercept(context, mockCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).not.toHaveBeenCalled();
          done();
        }, 10);
      },
    });
  });

  it('should skip requests without clinicId', (done) => {
    const context = createMockContext('POST', '/patients', false);
    interceptor.intercept(context, mockCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).not.toHaveBeenCalled();
          done();
        }, 10);
      },
    });
  });

  it('should skip excluded paths like /auth', (done) => {
    const context = createMockContext('POST', '/auth/login');
    interceptor.intercept(context, mockCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).not.toHaveBeenCalled();
          done();
        }, 10);
      },
    });
  });

  it('should skip when response has no id', (done) => {
    const noIdHandler: CallHandler = { handle: () => of({ message: 'ok' }) };
    const context = createMockContext('POST', '/patients');
    interceptor.intercept(context, noIdHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).not.toHaveBeenCalled();
          done();
        }, 10);
      },
    });
  });

  it('should skip when response is null', (done) => {
    const context = createMockContext('POST', '/patients');
    interceptor.intercept(context, emptyCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).not.toHaveBeenCalled();
          done();
        }, 10);
      },
    });
  });

  it('should log without user_id when user is not available', (done) => {
    const context = createMockContext('POST', '/patients', true, false);
    interceptor.intercept(context, mockCallHandler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({ user_id: undefined }),
          );
          done();
        }, 10);
      },
    });
  });
});
