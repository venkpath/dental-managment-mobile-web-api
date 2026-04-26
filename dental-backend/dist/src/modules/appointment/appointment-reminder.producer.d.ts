import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
export declare const APPOINTMENT_REMINDER_JOB = "send-appointment-reminder";
export declare class AppointmentReminderProducer {
    private readonly reminderQueue;
    private readonly prisma;
    private readonly logger;
    constructor(reminderQueue: Queue, prisma: PrismaService);
    scheduleReminders(appointmentId: string, clinicId: string, appointmentDate: Date, startTime: string): Promise<void>;
    scheduleRemindersWithResult(appointmentId: string, clinicId: string, appointmentDate: Date, startTime: string): Promise<{
        overallStatus: 'ok' | 'no_rule' | 'rule_disabled';
        results: Array<{
            reminderIndex: number;
            reminderHours: number;
            status: 'scheduled' | 'already_scheduled' | 'disabled' | 'already_passed' | 'failed';
            jobId?: string;
            firesAt?: string;
            error?: string;
        }>;
    }>;
    cancelReminders(appointmentId: string): Promise<void>;
    rescheduleReminders(appointmentId: string, clinicId: string, newAppointmentDate: Date, newStartTime: string): Promise<void>;
    previewReminders(appointmentId: string, clinicId: string, appointmentDate: Date, startTime: string): Promise<{
        status: string;
        reminders: never[];
        appointmentId?: undefined;
        appointmentStartUtc?: undefined;
        nowUtc?: undefined;
    } | {
        status: string;
        appointmentId: string;
        appointmentStartUtc: string;
        nowUtc: string;
        reminders: {
            reminderIndex: 1 | 2;
            reminderHours: number;
            enabled: boolean;
            wouldFireAt: string;
            wouldFireIn: string | null;
            status: string;
        }[];
    }>;
}
