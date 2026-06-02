import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { ReviewTriggerService } from '../public-directory/review-trigger.service.js';
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto, CreateRefundDto } from './dto/index.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { Invoice, Payment, Refund, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
import { PatientInsuranceService } from '../insurance/services/patient-insurance.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
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
    readonly patient_insurance: {
        readonly include: {
            readonly plan: {
                readonly include: {
                    readonly provider: {
                        readonly select: {
                            readonly id: true;
                            readonly name: true;
                            readonly short_code: true;
                            readonly type: true;
                            readonly country: true;
                            readonly claim_method: true;
                        };
                    };
                };
            };
        };
    };
    readonly insurance_claims: {
        readonly orderBy: {
            readonly created_at: "desc";
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
    private readonly reviewTrigger;
    private readonly invoicePdfService;
    private readonly s3Service;
    private readonly planLimit;
    private readonly patientInsurance;
    private readonly auditLog;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService, automationService: AutomationService, reviewTrigger: ReviewTriggerService, invoicePdfService: InvoicePdfService, s3Service: S3Service, planLimit: PlanLimitService, patientInsurance: PatientInsuranceService, auditLog: AuditLogService);
    create(clinicId: string, dto: CreateInvoiceDto, createdByUserId?: string): Promise<Invoice>;
    findAll(clinicId: string, query: QueryInvoiceDto): Promise<PaginatedResult<Invoice>>;
    findOne(clinicId: string, id: string): Promise<InvoiceWithIncludes>;
    update(clinicId: string, id: string, dto: UpdateInvoiceDto, actingUserId?: string): Promise<Invoice>;
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
        total_amount: Prisma.Decimal;
        invoice_id: string;
        num_installments: number;
    }>;
    deleteInstallmentPlan(clinicId: string, invoiceId: string): Promise<{
        message: string;
    }>;
    getPdfUrl(clinicId: string, invoiceId: string): Promise<{
        url: string;
        filename: string;
    }>;
    sendWhatsApp(clinicId: string, invoiceId: string): Promise<{
        message: string;
    }>;
    sendEmail(clinicId: string, invoiceId: string): Promise<{
        message: string;
    }>;
    private generateInvoiceNumber;
    private sendPaymentConfirmation;
}
export {};
