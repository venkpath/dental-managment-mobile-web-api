import { PrismaService } from '../../database/prisma.service.js';
import { AuditLog } from '@prisma/client';
import { QueryAuditLogDto } from './dto/index.js';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
export interface CreateAuditLogInput {
    clinic_id: string;
    user_id?: string;
    action: string;
    entity: string;
    entity_id: string;
    metadata?: Record<string, unknown>;
}
export declare class AuditLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(input: CreateAuditLogInput): Promise<AuditLog>;
    findOne(clinicId: string, id: string): Promise<AuditLog>;
    findByClinic(clinicId: string, query: QueryAuditLogDto): Promise<PaginatedResult<AuditLog>>;
}
