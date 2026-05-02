import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
export declare const APPOINTMENT_REMINDER_JOB = "send-appointment-reminder";
export interface ReminderScheduleResult {
    kind: 'patient' | 'dentist';
    reminderIndex?: 1 | 2;
    reminderHours: number;
    status: 'scheduled' | 'already_scheduled' | 'disabled' | 'already_passed' | 'failed' | 'would_schedule';
    jobId?: string;
    firesAt?: string;
    wouldFireIn?: string | null;
    error?: string;
}
export declare class AppointmentReminderProducer {
    private readonly reminderQueue;
    private readonly prisma;
    private readonly logger;
    constructor(reminderQueue: Queue, prisma: PrismaService);
    scheduleReminders(appointmentId: string, clinicId: string, appointmentDate: Date, startTime: string): Promise<void>;
    private scheduleDentistReminder;
    scheduleRemindersWithResult(appointmentId: string, clinicId: string, appointmentDate: Date, startTime: string): Promise<{
        overallStatus: 'ok' | 'no_rule' | 'rule_disabled';
        results: ReminderScheduleResult[];
    }>;
    private tryScheduleSlot;
    cancelReminders(appointmentId: string): Promise<void>;
    rescheduleReminders(appointmentId: string, clinicId: string, newAppointmentDate: Date, newStartTime: string): Promise<void>;
    previewReminders(appointmentId: string, clinicId: string, appointmentDate: Date, startTime: string): Promise<{
        status: string;
        appointmentId: string;
        appointmentStartUtc: string;
        nowUtc: string;
        reminders: ReminderScheduleResult[];
    }>;
}
