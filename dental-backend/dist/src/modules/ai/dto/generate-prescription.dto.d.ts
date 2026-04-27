export declare class GeneratePrescriptionDto {
    patient_id: string;
    diagnosis: string;
    procedures_performed?: string;
    chief_complaint?: string;
    past_dental_history?: string;
    allergies_medical_history?: string;
    tooth_numbers?: string[];
    existing_medications?: string;
}
