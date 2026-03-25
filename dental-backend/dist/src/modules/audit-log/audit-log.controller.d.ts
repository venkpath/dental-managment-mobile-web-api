import { AuditLogService } from './audit-log.service.js';
import { QueryAuditLogDto } from './dto/index.js';
export declare class AuditLogController {
    private readonly auditLogService;
    constructor(auditLogService: AuditLogService);
    findAll(clinicId: string, query: QueryAuditLogDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        created_at: Date;
        clinic_id: string;
        entity: string;
        entity_id: string;
        action: string;
        user_id: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }>>;
    findOne(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        entity: string;
        entity_id: string;
        action: string;
        user_id: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
