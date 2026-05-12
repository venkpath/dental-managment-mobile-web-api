import { PrismaService } from '../../database/prisma.service.js';
import { SuperAdminWhatsAppService } from './super-admin-whatsapp.service.js';
export declare const INACTIVITY_TEMPLATE_REMINDER_30 = "clinic_inactivity_reminder_30";
export declare const INACTIVITY_TEMPLATE_REMINDER_40 = "clinic_inactivity_reminder_40";
export declare const INACTIVITY_TEMPLATE_SUSPENDED = "clinic_account_suspended";
export declare class InactivityCronService {
    private readonly prisma;
    private readonly whatsApp;
    private readonly logger;
    constructor(prisma: PrismaService, whatsApp: SuperAdminWhatsAppService);
    checkInactivity(): Promise<void>;
    runNow(): Promise<{
        checked: number;
    }>;
    private suspendClinic;
    private sendReminder;
}
