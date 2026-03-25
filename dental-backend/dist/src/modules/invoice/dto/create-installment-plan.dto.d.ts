export declare class InstallmentItemDto {
    installment_number: number;
    amount: number;
    due_date: string;
}
export declare class CreateInstallmentPlanDto {
    invoice_id?: string;
    notes?: string;
    items: InstallmentItemDto[];
}
