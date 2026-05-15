export declare class CreateManualInvoiceDto {
    clinic_id: string;
    plan_id: string;
    billing_cycle: 'monthly' | 'yearly';
    total_amount: number;
    period_start: Date;
    period_end: Date;
    due_date?: Date;
    notes?: string;
    send_immediately?: boolean;
}
export declare class CancelInvoiceDto {
    reason?: string;
}
export declare class MarkPaidOfflineDto {
    payment_reference?: string;
    note?: string;
}
