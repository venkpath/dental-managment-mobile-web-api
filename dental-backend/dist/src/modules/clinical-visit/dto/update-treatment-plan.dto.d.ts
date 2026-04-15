export declare enum TreatmentPlanStatus {
    PROPOSED = "proposed",
    ACCEPTED = "accepted",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare class UpdateTreatmentPlanDto {
    title?: string;
    notes?: string;
    status?: TreatmentPlanStatus;
}
