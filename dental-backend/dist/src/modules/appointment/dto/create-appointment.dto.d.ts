export declare enum AppointmentStatus {
    SCHEDULED = "scheduled",
    CHECKED_IN = "checked_in",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    NO_SHOW = "no_show"
}
export declare class CreateAppointmentDto {
    branch_id: string;
    patient_id: string;
    dentist_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    notes?: string;
}
