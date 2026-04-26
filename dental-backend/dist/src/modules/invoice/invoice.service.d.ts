import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto } from './dto/index.js';
import { Invoice, Payment, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
export declare class InvoiceService {
    private readonly prisma;
    private readonly communicationService;
    private readonly automationService;
    private readonly invoicePdfService;
    private readonly s3Service;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, automationService: AutomationService, invoicePdfService: InvoicePdfService, s3Service: S3Service);
    create(clinicId: string, dto: CreateInvoiceDto): Promise<Invoice>;
    findAll(clinicId: string, query: QueryInvoiceDto): Promise<PaginatedResult<Invoice>>;
    findOne(clinicId: string, id: string): Promise<Invoice>;
    addPayment(clinicId: string, dto: CreatePaymentDto): Promise<Payment>;
    createInstallmentPlan(clinicId: string, dto: CreateInstallmentPlanDto): Promise<{
        items: {
            id: string;
            status: string;
            created_at: Date;
            amount: Prisma.Decimal;
            due_date: Date;
            paid_at: Date | null;
            installment_plan_id: string;
            installment_number: number;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        notes: string | null;
        invoice_id: string;
        total_amount: Prisma.Decimal;
        num_installments: number;
    }>;
    deleteInstallmentPlan(clinicId: string, invoiceId: string): Promise<{
        message: string;
    }>;
    getPdfUrl(clinicId: string, invoiceId: string): Promise<{
        url: string;
    }>;
    sendWhatsApp(clinicId: string, invoiceId: string): Promise<{
        message: string;
    }>;
    private generateInvoiceNumber;
    private sendPaymentConfirmation;
}
