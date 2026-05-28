export declare class SubmitClaimDto {
    submission_method: string;
    submission_ref?: string;
    claim_number?: string;
    notes?: string;
}
export declare class UpdateClaimStatusDto {
    status: string;
    claim_number?: string;
    approved_amount?: number;
    patient_portion?: number;
    disallowed_amount?: number;
    rejection_reason?: string;
    query_text?: string;
    notes?: string;
}
export declare class RecordClaimPaymentDto {
    paid_amount: number;
    paid_at?: string;
    bank_utr_ref?: string;
    notes?: string;
}
export declare class ReimbursementAllocationDto {
    claim_id: string;
    allocated_amount: number;
    disallowed_amount?: number;
    disallowance_reason?: string;
    action_taken?: string;
}
export declare class CreateReimbursementDto {
    received_at: string;
    amount_received: number;
    tds_deducted?: number;
    bank_utr_ref?: string;
    currency?: string;
    notes?: string;
    allocations: ReimbursementAllocationDto[];
}
