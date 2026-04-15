import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare enum ClinicalVisitStatus {
    IN_PROGRESS = "in_progress",
    FINALIZED = "finalized",
    CANCELLED = "cancelled"
}
export declare class QueryClinicalVisitDto extends PaginationQueryDto {
    patient_id?: string;
    dentist_id?: string;
    branch_id?: string;
    appointment_id?: string;
    status?: ClinicalVisitStatus;
}
