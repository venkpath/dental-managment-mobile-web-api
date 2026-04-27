import { PlatformBillingService } from './platform-billing.service.js';
declare class ListAllInvoicesQueryDto {
    status?: string;
    clinic_id?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
}
export declare class PlatformBillingSuperAdminController {
    private readonly billing;
    constructor(billing: PlatformBillingService);
    list(query: ListAllInvoicesQueryDto): Promise<{
        items: ({
            clinic: {
                id: string;
                email: string;
                name: string;
            };
        } & {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            plan_id: string | null;
            billing_cycle: string;
            clinic_id: string;
            currency: string;
            period_start: Date;
            plan_name: string;
            total_amount: import("@prisma/client-runtime-utils").Decimal;
            invoice_number: string;
            tax_amount: import("@prisma/client-runtime-utils").Decimal;
            razorpay_payment_id: string | null;
            period_end: Date;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            tax_rate: import("@prisma/client-runtime-utils").Decimal;
            cgst_amount: import("@prisma/client-runtime-utils").Decimal;
            sgst_amount: import("@prisma/client-runtime-utils").Decimal;
            igst_amount: import("@prisma/client-runtime-utils").Decimal;
            bill_to_name: string;
            bill_to_email: string;
            bill_to_phone: string | null;
            bill_to_address: string | null;
            bill_to_city: string | null;
            bill_to_state: string | null;
            bill_to_pincode: string | null;
            bill_to_gstin: string | null;
            razorpay_subscription_id: string | null;
            pdf_s3_key: string | null;
            delivery_status: string;
            whatsapp_sent_at: Date | null;
            whatsapp_error: string | null;
            email_sent_at: Date | null;
            email_error: string | null;
            issued_at: Date;
        })[];
        total: number;
        totals: {
            total_amount_inr: number;
            tax_amount_inr: number;
        };
    }>;
    get(id: string): Promise<{
        clinic: {
            id: string;
            email: string;
            name: string;
            phone: string | null;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        plan_id: string | null;
        billing_cycle: string;
        clinic_id: string;
        currency: string;
        period_start: Date;
        plan_name: string;
        total_amount: import("@prisma/client-runtime-utils").Decimal;
        invoice_number: string;
        tax_amount: import("@prisma/client-runtime-utils").Decimal;
        razorpay_payment_id: string | null;
        period_end: Date;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        tax_rate: import("@prisma/client-runtime-utils").Decimal;
        cgst_amount: import("@prisma/client-runtime-utils").Decimal;
        sgst_amount: import("@prisma/client-runtime-utils").Decimal;
        igst_amount: import("@prisma/client-runtime-utils").Decimal;
        bill_to_name: string;
        bill_to_email: string;
        bill_to_phone: string | null;
        bill_to_address: string | null;
        bill_to_city: string | null;
        bill_to_state: string | null;
        bill_to_pincode: string | null;
        bill_to_gstin: string | null;
        razorpay_subscription_id: string | null;
        pdf_s3_key: string | null;
        delivery_status: string;
        whatsapp_sent_at: Date | null;
        whatsapp_error: string | null;
        email_sent_at: Date | null;
        email_error: string | null;
        issued_at: Date;
    }>;
    getPdf(id: string): Promise<{
        url: string;
        filename: string;
    }>;
    resend(id: string): Promise<{
        whatsapp: boolean;
        email: boolean;
    }>;
}
export {};
