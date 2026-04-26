import { PrismaService } from '../../database/prisma.service.js';
import { AppointmentReminderProducer } from './appointment-reminder.producer.js';
export declare class AppointmentReminderReconciler {
    private readonly prisma;
    private readonly reminderProducer;
    private readonly logger;
    constructor(prisma: PrismaService, reminderProducer: AppointmentReminderProducer);
    reconcileUpcomingReminderJobs(): Promise<void>;
}
