import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class QueryAuditLogDto extends PaginationQueryDto {
    entity?: string;
    entity_id?: string;
    action?: string;
    user_id?: string;
}
