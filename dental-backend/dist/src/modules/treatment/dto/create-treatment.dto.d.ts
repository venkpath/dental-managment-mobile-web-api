export declare enum TreatmentStatus {
    PLANNED = "planned",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed"
}
export declare class CreateTreatmentDto {
    branch_id: string;
    patient_id: string;
    dentist_id: string;
    tooth_number?: string;
    diagnosis: string;
    procedure: string;
    cost: number;
    status?: TreatmentStatus;
    notes?: string;
}
