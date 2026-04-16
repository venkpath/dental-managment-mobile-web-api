export declare class PrescriptionItemDto {
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    morning?: number;
    afternoon?: number;
    evening?: number;
    night?: number;
    notes?: string;
}
export declare class CreatePrescriptionDto {
    branch_id: string;
    patient_id: string;
    dentist_id: string;
    clinical_visit_id?: string;
    diagnosis: string;
    instructions?: string;
    items: PrescriptionItemDto[];
}
