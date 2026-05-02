export type PatientReminderJobData = {
    kind?: 'patient';
    appointmentId: string;
    clinicId: string;
    reminderIndex: 1 | 2;
    reminderHours: number;
};
export type DentistReminderJobData = {
    kind: 'dentist';
    appointmentId: string;
    clinicId: string;
    reminderHours: number;
};
export type AppointmentReminderJobData = PatientReminderJobData | DentistReminderJobData;
