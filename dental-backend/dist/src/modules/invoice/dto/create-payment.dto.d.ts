export declare enum PaymentMethod {
    CASH = "cash",
    CARD = "card",
    UPI = "upi"
}
export declare class CreatePaymentDto {
    invoice_id: string;
    installment_item_id?: string;
    method: PaymentMethod;
    amount: number;
    notes?: string;
}
