export declare class CreateClinicalVisitDto {
    branch_id: string;
    patient_id: string;
    dentist_id: string;
    appointment_id?: string;
    chief_complaint?: string;
    history_of_present_illness?: string;
    past_dental_history?: string;
    medical_history_notes?: string;
    examination_notes?: string;
    review_after_date?: string;
    vital_signs?: Record<string, unknown>;
}
