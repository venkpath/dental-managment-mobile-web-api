import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from './automation.service.js';
export declare class AutomationCronService {
    private readonly prisma;
    private readonly communicationService;
    private readonly automationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, automationService: AutomationService);
    birthdayGreetings(): Promise<void>;
    festivalGreetings(): Promise<void>;
    appointmentRemindersToPatients(): Promise<void>;
    paymentReminders(): Promise<void>;
    dormantPatientDetection(): Promise<void>;
    treatmentPlanReminders(): Promise<void>;
    noShowFollowUp(): Promise<void>;
    postTreatmentCare(): Promise<void>;
    feedbackCollection(): Promise<void>;
    overduePaymentNotification(): Promise<void>;
    googleReviewSolicitation(): Promise<void>;
    patientAnniversaryGreeting(): Promise<void>;
    prescriptionRefillReminder(): Promise<void>;
    private getActiveClinics;
    private resolveChannel;
    private toMessageChannel;
    private parseDurationToDays;
}
