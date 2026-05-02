import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto, CreateRefundDto } from './dto/index.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { Invoice, Payment, Refund, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
declare const INVOICE_INCLUDE: {
    readonly items: {
        readonly include: {
            readonly treatment: {
                readonly include: {
                    readonly dentist: true;
                };
            };
        };
    };
    readonly payments: {
        readonly include: {
            readonly installment_item: true;
        };
        readonly orderBy: {
            readonly paid_at: "asc";
        };
    };
    readonly refunds: {
        readonly orderBy: {
            readonly refunded_at: "asc";
        };
    };
    readonly patient: true;
    readonly branch: true;
    readonly clinic: true;
    readonly dentist: true;
    readonly created_by: true;
    readonly installment_plan: {
        readonly include: {
            readonly items: {
                readonly orderBy: {
                    readonly installment_number: "asc";
                };
            };
        };
    };
};
type InvoiceWithIncludes = Prisma.InvoiceGetPayload<{
    include: typeof INVOICE_INCLUDE;
}>;
export declare class InvoiceService {
    private readonly prisma;
    private readonly communicationService;
    private readonly automationService;
    private readonly invoicePdfService;
    private readonly s3Service;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, automationService: AutomationService, invoicePdfService: InvoicePdfService, s3Service: S3Service);
    create(clinicId: string, dto: CreateInvoiceDto, createdByUserId?: string): Promise<Invoice>;
    findAll(clinicId: string, query: QueryInvoiceDto): Promise<PaginatedResult<Invoice>>;
    findOne(clinicId: string, id: string): Promise<InvoiceWithIncludes>;
    update(clinicId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice>;
    addPayment(clinicId: string, dto: CreatePaymentDto): Promise<Payment>;
    addRefund(clinicId: string, invoiceId: string, dto: CreateRefundDto, userId?: string): Promise<Refund>;
    issueInvoice(clinicId: string, invoiceId: string, userId?: string): Promise<Invoice>;
    cancelInvoice(clinicId: string, invoiceId: string, userId?: string, reason?: string): Promise<Invoice>;
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
export {};
