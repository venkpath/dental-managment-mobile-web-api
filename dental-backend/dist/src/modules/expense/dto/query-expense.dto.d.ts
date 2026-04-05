import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class QueryExpenseDto extends PaginationQueryDto {
    branch_id?: string;
    category_id?: string;
    start_date?: string;
    end_date?: string;
    payment_mode?: string;
    search?: string;
}
