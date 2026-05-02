export declare enum RefundMethod {
    CASH = "cash",
    CARD = "card",
    UPI = "upi",
    BANK_TRANSFER = "bank_transfer"
}
export declare class CreateRefundDto {
    payment_id?: string;
    method: RefundMethod;
    amount: number;
    reason?: string;
}
