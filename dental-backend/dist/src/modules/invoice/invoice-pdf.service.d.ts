interface InvoiceData {
    invoice_number: string;
    created_at: Date;
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
        date_of_birth?: string | null;
        age?: number | null;
    };
    dentist?: {
        name: string;
        specialization?: string | null;
        license_number?: string | null;
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
    currency_code?: string;
}
export declare class InvoicePdfService {
    generate(data: InvoiceData): Promise<Buffer>;
}
export {};
