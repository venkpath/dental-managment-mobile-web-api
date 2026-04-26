export interface AppointmentReminderJobData {
    appointmentId: string;
    clinicId: string;
    reminderIndex: 1 | 2;
    reminderHours: number;
}
