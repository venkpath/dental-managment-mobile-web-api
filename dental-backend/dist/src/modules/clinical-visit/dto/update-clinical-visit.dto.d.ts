import { CreateClinicalVisitDto } from './create-clinical-visit.dto.js';
declare const UpdateClinicalVisitDto_base: import("@nestjs/common").Type<Partial<CreateClinicalVisitDto>>;
export declare class UpdateClinicalVisitDto extends UpdateClinicalVisitDto_base {
    diagnosis_summary?: string;
    soap_notes?: Record<string, unknown>;
    review_after_date?: string;
}
export {};
