import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel } from '../communication/dto/send-message.dto.js';
import { AiService } from '../ai/ai.service.js';
import { AutomationService } from './automation.service.js';
export interface UntreatedConditionFinding {
    condition: string;
    fdi: number;
    createdAt: Date;
}
export interface PatientUntreatedSnapshot {
    patientId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    branchId: string | null;
    findings: UntreatedConditionFinding[];
    anchorAt: Date;
}
export declare function parseToothFdiNumbers(raw: string | null | undefined): number[];
export declare class UntreatedConditionReminderService {
    private readonly prisma;
    private readonly communicationService;
    private readonly automationService;
    private readonly aiService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, automationService: AutomationService, aiService: AiService);
    findPatientsWithUntreatedConditions(clinicId: string): Promise<PatientUntreatedSnapshot[]>;
    wasReminderSent(clinicId: string, patientId: string, reminderIndex: 1 | 2, anchorAt: Date): Promise<boolean>;
    private isDelayElapsed;
    processClinic(clinic: {
        id: string;
        name: string;
        phone: string | null;
    }, resolveChannel: (clinicId: string, patientId: string, ruleChannel: string) => Promise<MessageChannel>): Promise<number>;
    private sendReminder;
}
