import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { ReportsService } from './reports.service.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { CommunicationProducer } from '../communication/communication.producer.js';
export declare const DAILY_SUMMARY_WA_TEMPLATE = "daily_clinic_summary";
export declare class DailySummaryCronService {
    private readonly prisma;
    private readonly reportsService;
    private readonly emailProvider;
    private readonly communicationProducer;
    private readonly config;
    private readonly logger;
    private readonly openai;
    constructor(prisma: PrismaService, reportsService: ReportsService, emailProvider: EmailProvider, communicationProducer: CommunicationProducer, config: ConfigService);
    private ensureEmailConfigured;
    sendDailySummaries(): Promise<void>;
    private getSevenDayAverage;
    private generateAiInsight;
    private buildEmailHtml;
}
