import { InvoiceService } from './invoice.service.js';
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto } from './dto/index.js';
export declare class InvoiceController {
    private readonly invoiceService;
    constructor(invoiceService: InvoiceService);
    createInvoice(clinicId: string, dto: CreateInvoiceDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        total_amount: import("@prisma/client-runtime-utils").Decimal;
        invoice_number: string;
        tax_amount: import("@prisma/client-runtime-utils").Decimal;
        discount_amount: import("@prisma/client-runtime-utils").Decimal;
        net_amount: import("@prisma/client-runtime-utils").Decimal;
        gst_number: string | null;
        tax_breakdown: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    findAll(clinicId: string, query: QueryInvoiceDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        total_amount: import("@prisma/client-runtime-utils").Decimal;
        invoice_number: string;
        tax_amount: import("@prisma/client-runtime-utils").Decimal;
        discount_amount: import("@prisma/client-runtime-utils").Decimal;
        net_amount: import("@prisma/client-runtime-utils").Decimal;
        gst_number: string | null;
        tax_breakdown: import("@prisma/client/runtime/client").JsonValue | null;
    }>>;
    findOne(clinicId: string, id: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        total_amount: import("@prisma/client-runtime-utils").Decimal;
        invoice_number: string;
        tax_amount: import("@prisma/client-runtime-utils").Decimal;
        discount_amount: import("@prisma/client-runtime-utils").Decimal;
        net_amount: import("@prisma/client-runtime-utils").Decimal;
        gst_number: string | null;
        tax_breakdown: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    createPayment(clinicId: string, dto: CreatePaymentDto): Promise<{
        id: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: string;
        notes: string | null;
        paid_at: Date;
        invoice_id: string;
        installment_item_id: string | null;
    }>;
    createInstallmentPlan(clinicId: string, id: string, dto: CreateInstallmentPlanDto): Promise<{
        items: {
            id: string;
            status: string;
            created_at: Date;
            amount: import("@prisma/client-runtime-utils").Decimal;
            due_date: Date;
            installment_plan_id: string;
            installment_number: number;
            paid_at: Date | null;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        notes: string | null;
        invoice_id: string;
        total_amount: import("@prisma/client-runtime-utils").Decimal;
        num_installments: number;
    }>;
    deleteInstallmentPlan(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    getPdfUrl(clinicId: string, id: string): Promise<{
        url: string;
    }>;
    invoiceRedirect(id: string, clinicId: string): Promise<{
        url: string;
        statusCode: number;
    }>;
    sendWhatsApp(clinicId: string, id: string): Promise<{
        message: string;
    }>;
}
