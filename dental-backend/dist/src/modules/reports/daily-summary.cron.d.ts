import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { ReportsService } from './reports.service.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { WhatsAppProvider } from '../communication/providers/whatsapp.provider.js';
import { CommunicationService } from '../communication/communication.service.js';
export declare const DAILY_SUMMARY_WA_TEMPLATE = "daily_clinic_summary";
export declare class DailySummaryCronService {
    private readonly prisma;
    private readonly reportsService;
    private readonly emailProvider;
    private readonly whatsAppProvider;
    private readonly communicationService;
    private readonly config;
    private readonly logger;
    private readonly openai;
    constructor(prisma: PrismaService, reportsService: ReportsService, emailProvider: EmailProvider, whatsAppProvider: WhatsAppProvider, communicationService: CommunicationService, config: ConfigService);
    private ensureEmailConfigured;
    sendDailySummaries(): Promise<void>;
    private getSevenDayAverage;
    private generateAiInsight;
    private buildEmailHtml;
}
