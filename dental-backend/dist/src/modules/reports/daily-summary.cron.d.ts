import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { ReportsService } from './reports.service.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { CommunicationService } from '../communication/communication.service.js';
export declare const WEEKLY_SUMMARY_WA_TEMPLATE = "weekly_clinic_summary";
export declare class DailySummaryCronService {
    private readonly prisma;
    private readonly reportsService;
    private readonly emailProvider;
    private readonly communicationService;
    private readonly config;
    private readonly logger;
    private readonly openai;
    constructor(prisma: PrismaService, reportsService: ReportsService, emailProvider: EmailProvider, communicationService: CommunicationService, config: ConfigService);
    private ensureEmailConfigured;
    private firstName;
    sendWeeklySummaries(channels?: ('email' | 'whatsapp')[]): Promise<void>;
    private generateAiInsight;
    private buildEmailHtml;
}
