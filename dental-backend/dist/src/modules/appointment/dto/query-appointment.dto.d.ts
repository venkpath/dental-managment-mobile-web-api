import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class QueryAppointmentDto extends PaginationQueryDto {
    date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    dentist_id?: string;
    branch_id?: string;
    patient_id?: string;
}
