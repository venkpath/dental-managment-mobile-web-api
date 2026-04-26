export interface AppointmentReminderJobData {
  appointmentId: string;
  clinicId: string;
  /** Which reminder slot (1 or 2) — matches reminder_1_hours / reminder_2_hours config keys */
  reminderIndex: 1 | 2;
  /** How many hours before the appointment this reminder is scheduled for (for logging) */
  reminderHours: number;
}
