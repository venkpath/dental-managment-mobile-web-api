import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class CreateFeedbackDto {
    patient_id: string;
    appointment_id?: string;
    rating: number;
    comment?: string;
}
export declare class QueryFeedbackDto extends PaginationQueryDto {
    patient_id?: string;
    min_rating?: number;
}
