import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditLogService } from '../../modules/audit-log/audit-log.service.js';
export declare class AuditLogInterceptor implements NestInterceptor {
    private readonly auditLogService;
    private readonly logger;
    constructor(auditLogService: AuditLogService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private extractEntity;
    private isUuid;
}
