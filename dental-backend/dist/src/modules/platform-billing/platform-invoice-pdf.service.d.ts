export interface PlatformInvoicePdfData {
    invoice_number: string;
    issued_at: Date;
    status: string;
    plan_name: string;
    billing_cycle: string;
    period_start: Date;
    period_end: Date;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    currency: string;
    bill_to: {
        name: string;
        email: string;
        phone?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        pincode?: string | null;
        gstin?: string | null;
    };
    razorpay_payment_id?: string | null;
}
export declare class PlatformInvoicePdfService {
    generate(data: PlatformInvoicePdfData): Promise<Buffer>;
}
