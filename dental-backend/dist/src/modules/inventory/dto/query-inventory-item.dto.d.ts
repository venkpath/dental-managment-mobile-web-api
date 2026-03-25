import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class QueryInventoryItemDto extends PaginationQueryDto {
    branch_id?: string;
    name?: string;
    category?: string;
    low_stock?: string;
}
