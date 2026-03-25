export declare class CreateRecurringAppointmentDto {
    branch_id: string;
    patient_id: string;
    dentist_id: string;
    start_date: string;
    start_time: string;
    end_time: string;
    interval: string;
    occurrences: number;
    notes?: string;
}
