import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { TreatmentStatus } from './create-treatment.dto.js';
export declare class QueryTreatmentDto extends PaginationQueryDto {
    patient_id?: string;
    dentist_id?: string;
    branch_id?: string;
    status?: TreatmentStatus;
}
