import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
export declare class AppointmentNotificationService {
    private readonly prisma;
    private readonly communicationService;
    private readonly automationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, automationService: AutomationService);
    sendConfirmation(clinicId: string, appointmentId: string): Promise<void>;
    sendCancellation(clinicId: string, appointmentId: string): Promise<void>;
    sendDentistConfirmation(clinicId: string, appointmentId: string): Promise<void>;
    sendDentistReminder(clinicId: string, appointmentId: string, hoursUntil: number): Promise<void>;
    sendReschedule(clinicId: string, appointmentId: string, oldDate: string, oldTime: string): Promise<void>;
    private sendNotification;
    private sendDentistNotification;
    private buildDentistVariables;
    private formatTimeUntil;
    private clinicHasFeature;
    private resolveTemplate;
    private loadAppointment;
    private buildVariables;
    private sendTemplateByName;
    private formatDate;
    private formatTime;
}
