import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import type { AppointmentReminderJobData } from './appointment-reminder.types.js';
import { AppointmentNotificationService } from './appointment-notification.service.js';
export declare class AppointmentReminderProcessor extends WorkerHost {
    private readonly prisma;
    private readonly communicationService;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, notificationService: AppointmentNotificationService);
    process(job: Job<AppointmentReminderJobData>): Promise<void>;
}
