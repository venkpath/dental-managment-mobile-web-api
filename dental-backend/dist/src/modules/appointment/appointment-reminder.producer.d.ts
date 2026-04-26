import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
export declare const APPOINTMENT_REMINDER_JOB = "send-appointment-reminder";
export declare class AppointmentReminderProducer {
    private readonly reminderQueue;
    private readonly prisma;
    private readonly logger;
    constructor(reminderQueue: Queue, prisma: PrismaService);
    scheduleReminders(appointmentId: string, clinicId: string, appointmentDate: Date, startTime: string): Promise<void>;
    cancelReminders(appointmentId: string): Promise<void>;
    rescheduleReminders(appointmentId: string, clinicId: string, newAppointmentDate: Date, newStartTime: string): Promise<void>;
}
