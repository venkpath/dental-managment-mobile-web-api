import { PrismaService } from '../../database/prisma.service.js';
import { NotificationService } from './notification.service.js';
import { PushNotificationService } from './push-notification.service.js';
export declare class AppointmentStaffNotificationService {
    private readonly prisma;
    private readonly notificationService;
    private readonly pushNotificationService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService, pushNotificationService: PushNotificationService);
    notifyAppointmentConfirmed(clinicId: string, appointmentId: string): Promise<void>;
    notifyAppointmentReminder30Min(clinicId: string, appointmentId: string): Promise<void>;
    private loadAppointment;
    private notifyStaffRecipients;
}
