import { PrismaService } from '../../database/prisma.service.js';
import { NotificationService } from './notification.service.js';
export declare class NotificationCronService {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    appointmentReminders(): Promise<void>;
    paymentOverdueAlerts(): Promise<void>;
    lowInventoryAlerts(): Promise<void>;
}
