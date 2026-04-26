import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class QueryPrescriptionDto extends PaginationQueryDto {
    branch_id?: string;
    dentist_id?: string;
    search?: string;
}
