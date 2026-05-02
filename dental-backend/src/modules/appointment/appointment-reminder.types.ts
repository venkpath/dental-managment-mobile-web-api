/**
 * Reminder job data shapes — one per recipient kind.
 *
 * Patient: piggy-backs on the `appointment_reminder_patient` rule with two
 * configurable slots (reminder_1_hours, reminder_2_hours).
 *
 * Dentist: single slot, hours configurable on the
 * `appointment_reminder_dentist` rule's `config.hours`. Recipient is the
 * appointment's assigned dentist/consultant, not the patient.
 *
 * `kind` is optional on the patient variant so jobs already in BullMQ
 * (scheduled before this field existed) keep deserializing as patient
 * reminders without breaking on deploy.
 */
export type PatientReminderJobData = {
  kind?: 'patient';
  appointmentId: string;
  clinicId: string;
  /** Which reminder slot (1 or 2) — matches reminder_1_hours / reminder_2_hours config keys */
  reminderIndex: 1 | 2;
  /** How many hours before the appointment this reminder is scheduled for (for logging) */
  reminderHours: number;
};

export type DentistReminderJobData = {
  kind: 'dentist';
  appointmentId: string;
  clinicId: string;
  /** Hours before the appointment, copied from the dentist rule's config.hours */
  reminderHours: number;
};

export type AppointmentReminderJobData =
  | PatientReminderJobData
  | DentistReminderJobData;
