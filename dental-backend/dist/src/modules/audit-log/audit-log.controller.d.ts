import { AuditLogService } from './audit-log.service.js';
import { QueryAuditLogDto } from './dto/index.js';
export declare class AuditLogController {
    private readonly auditLogService;
    constructor(auditLogService: AuditLogService);
    findAll(clinicId: string, query: QueryAuditLogDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        created_at: Date;
        clinic_id: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        user_id: string | null;
        entity: string;
        entity_id: string;
        action: string;
    }>>;
    findOne(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        user_id: string | null;
        entity: string;
        entity_id: string;
        action: string;
    }>;
}
