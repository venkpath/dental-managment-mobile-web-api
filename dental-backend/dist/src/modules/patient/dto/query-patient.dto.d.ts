import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class QueryPatientDto extends PaginationQueryDto {
    search?: string;
    phone?: string;
    name?: string;
    gender?: string;
    branch_id?: string;
}
