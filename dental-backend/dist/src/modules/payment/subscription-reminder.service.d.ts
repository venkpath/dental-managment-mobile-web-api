import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
export declare class SubscriptionReminderService {
    private readonly prisma;
    private readonly communicationService;
    private readonly automationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, automationService: AutomationService);
    sendDailyReminders(): Promise<void>;
    private processTrialReminders;
    private sendTrialReminderForClinic;
    private processRenewalReminders;
    private sendRenewalReminderForClinic;
    private processExpiredReminders;
    private sendExpiredReminderForClinic;
    private findAdminUser;
    private alreadySentToday;
    private formatDate;
    private parseNumberArray;
    private startOfDay;
    private endOfDay;
    private addDays;
}
