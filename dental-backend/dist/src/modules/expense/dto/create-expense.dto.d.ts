export declare class CreateExpenseDto {
    branch_id?: string;
    category_id: string;
    title: string;
    amount: number;
    date: string;
    payment_mode?: string;
    vendor?: string;
    receipt_url?: string;
    notes?: string;
    is_recurring?: boolean;
    recurring_frequency?: string;
}
