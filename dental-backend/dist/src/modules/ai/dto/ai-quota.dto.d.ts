export declare class UpdateAiSettingsDto {
    overage_enabled: boolean;
}
export declare class CreateAiQuotaApprovalRequestDto {
    requested_amount: number;
    reason?: string;
}
export declare class DecideAiQuotaApprovalRequestDto {
    status: 'approved' | 'rejected';
    approved_amount?: number;
    note?: string;
}
export declare class MarkOverageChargePaidDto {
    payment_reference?: string;
    note?: string;
}
