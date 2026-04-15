export declare enum PlanItemUrgency {
    IMMEDIATE = "immediate",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare class TreatmentPlanItemDto {
    tooth_number?: string;
    procedure: string;
    diagnosis?: string;
    estimated_cost: number;
    urgency?: PlanItemUrgency;
    phase?: number;
    sequence?: number;
    notes?: string;
}
export declare class CreateTreatmentPlanDto {
    branch_id: string;
    patient_id: string;
    dentist_id: string;
    clinical_visit_id?: string;
    title: string;
    notes?: string;
    items: TreatmentPlanItemDto[];
}
