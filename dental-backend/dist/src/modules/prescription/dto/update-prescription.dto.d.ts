import { PrescriptionItemDto } from './create-prescription.dto.js';
export declare class UpdatePrescriptionDto {
    diagnosis?: string;
    instructions?: string;
    chief_complaint?: string;
    past_dental_history?: string;
    allergies_medical_history?: string;
    interactions?: string;
    dietary_advice?: string;
    post_procedure_instructions?: string;
    follow_up?: string;
    dentist_id?: string;
    items?: PrescriptionItemDto[];
}
