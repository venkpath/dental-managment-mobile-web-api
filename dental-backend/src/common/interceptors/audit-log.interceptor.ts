import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditLogService } from '../../modules/audit-log/audit-log.service.js';

const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'create',
  PATCH: 'update',
  PUT: 'update',
  DELETE: 'delete',
};

const EXCLUDED_PATHS = ['/health', '/auth', '/api/docs'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const action = METHOD_ACTION_MAP[method];

    if (!action) {
      return next.handle();
    }

    const path = request.path;
    if (EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded))) {
      return next.handle();
    }

    const clinicId = request.clinicId;
    if (!clinicId) {
      return next.handle();
    }

    const userId = request.user?.userId;

    return next.handle().pipe(
      tap((responseBody) => {
        if (!responseBody || typeof responseBody !== 'object') {
          return;
        }

        const entityId = (responseBody as Record<string, unknown>)['id'] as string;
        if (!entityId) {
          return;
        }

        const entity = this.extractEntity(path);
        if (!entity) {
          return;
        }

        this.auditLogService
          .log({
            clinic_id: clinicId,
            user_id: userId,
            action,
            entity,
            entity_id: entityId,
          })
          .catch((err) => {
            this.logger.error(`Failed to write audit log: ${err.message}`);
          });
      }),
    );
  }

  private extractEntity(path: string): string | null {
    const segments = path
      .replace(/^\/api\/v1\//, '')
      .replace(/^\//, '')
      .split('/')
      .filter(Boolean);

    for (const segment of segments) {
      if (!this.isUuid(segment)) {
        return segment;
      }
    }
    return null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}
