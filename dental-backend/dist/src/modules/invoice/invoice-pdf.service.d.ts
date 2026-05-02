interface InvoiceData {
    invoice_number: string;
    created_at: Date;
    treatment_date?: Date | string | null;
    lifecycle_status?: 'draft' | 'issued' | 'cancelled' | string | null;
    cancel_reason?: string | null;
    gst_number?: string | null;
    total_amount: number;
    discount_amount: number;
    tax_amount: number;
    net_amount: number;
    clinic: {
        name: string;
        email: string;
        phone?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        logo_image?: Buffer | null;
    };
    branch: {
        name: string;
        phone?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
    };
    patient: {
        first_name: string;
        last_name: string;
        phone: string;
        email?: string | null;
        date_of_birth?: Date | string | null;
        age?: number | null;
    };
    dentist?: {
        name: string;
        specialization?: string | null;
        license_number?: string | null;
    } | null;
    generated_by?: {
        name: string;
        signature_image?: Buffer | null;
    } | null;
    items: Array<{
        item_type: string;
        description: string;
        procedure?: string | null;
        quantity: number;
        unit_price: number;
        total_price: number;
        tooth_number?: string | null;
    }>;
    payments: Array<{
        amount: number;
        method: string;
        paid_at: Date;
    }>;
    refunds?: Array<{
        amount: number;
        method: string;
        refunded_at: Date;
        reason?: string | null;
    }>;
    currency_code?: string;
}
export declare class InvoicePdfService {
    generate(data: InvoiceData): Promise<Buffer>;
}
export {};
