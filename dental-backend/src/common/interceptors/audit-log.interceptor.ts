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

/** Singular entity name mapping from URL path segments */
const ENTITY_MAP: Record<string, string> = {
  appointments: 'appointment',
  patients: 'patient',
  treatments: 'treatment',
  prescriptions: 'prescription',
  invoices: 'invoice',
  payments: 'payment',
  branches: 'branch',
  clinics: 'clinic',
  users: 'user',
  inventory: 'inventory',
  attachments: 'attachment',
  notifications: 'notification',
  teeth: 'tooth',
};

const EXCLUDED_SEGMENTS = ['health', 'auth', 'docs', 'test-queue'];

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

    // Use originalUrl for reliable full-path (strip query string)
    const fullPath = (request.originalUrl || request.url || '').split('?')[0];

    const clinicId = request.clinicId;
    if (!clinicId) {
      return next.handle();
    }

    const entity = this.extractEntity(fullPath);
    if (!entity || EXCLUDED_SEGMENTS.includes(entity)) {
      return next.handle();
    }

    const userId = request.user?.userId;

    // Capture request body for metadata (strip sensitive fields)
    const requestBody = request.body ? { ...request.body } : undefined;
    if (requestBody) {
      delete requestBody.password;
      delete requestBody.password_hash;
      delete requestBody.old_password;
      delete requestBody.new_password;
    }

    // Capture IP + user-agent
    const ip = request.ip || request.headers['x-forwarded-for'] || undefined;
    const userAgent = request.headers['user-agent'] || undefined;

    return next.handle().pipe(
      tap((responseBody) => {
        try {
          if (!responseBody || typeof responseBody !== 'object') {
            return;
          }

          // Handle both raw response { id: '...' } and
          // envelope-wrapped response { success: true, data: { id: '...' } }
          const body = responseBody as Record<string, unknown>;
          let entityId = body['id'] as string | undefined;
          if (!entityId && body['data'] && typeof body['data'] === 'object') {
            entityId = (body['data'] as Record<string, unknown>)['id'] as string | undefined;
          }
          if (!entityId) {
            return;
          }

          // Normalize to singular entity name
          const entityName = ENTITY_MAP[entity] || entity;

          const metadata: Record<string, unknown> = {};
          if (action === 'create' && requestBody) {
            metadata.input = requestBody;
          } else if (action === 'update' && requestBody) {
            metadata.changes = requestBody;
          } else if (action === 'delete') {
            metadata.deleted = true;
          }
          if (ip) metadata.ip = ip;
          if (userAgent) metadata.user_agent = userAgent;

          this.auditLogService
            .log({
              clinic_id: clinicId,
              user_id: userId,
              action,
              entity: entityName,
              entity_id: entityId,
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            })
            .then(() => {
              this.logger.debug(`Audit: ${action} ${entityName} ${entityId}`);
            })
            .catch((err) => {
              this.logger.error(`Failed to write audit log: ${err.message}`);
            });
        } catch (err) {
          this.logger.error(`Audit interceptor error: ${(err as Error).message}`);
        }
      }),
    );
  }

  /** Extract the first meaningful path segment (entity name) from the URL */
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
