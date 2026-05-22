import { PrismaService } from '../../database/prisma.service.js';
import { type WhatsAppCategory } from '../communication/whatsapp-pricing.constants.js';
import { PlatformBillingService } from './platform-billing.service.js';
export interface OverageBreakdown {
    utility: {
        sent: number;
        billable: number;
        unit_price: number;
        amount: number;
    };
    marketing: {
        sent: number;
        billable: number;
        unit_price: number;
        amount: number;
    };
    authentication: {
        sent: number;
        billable: number;
        unit_price: number;
        amount: number;
    };
    total_sent: number;
    total_billable: number;
    total_amount: number;
    included_quota: number;
}
export declare class WhatsAppOverageService {
    private readonly prisma;
    private readonly platformBilling;
    private readonly logger;
    constructor(prisma: PrismaService, platformBilling: PlatformBillingService);
    computeForPeriod(clinicId: string, periodStart: Date): Promise<OverageBreakdown>;
    getCurrentMonthEstimate(clinicId: string): Promise<OverageBreakdown>;
    billPreviousMonthOverage(): Promise<void>;
    private createOverageInvoice;
    private toLineItems;
    private emptyBreakdown;
}
export type { WhatsAppCategory };
