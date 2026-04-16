export declare class CreateMembershipUsageDto {
    membership_benefit_id: string;
    patient_id: string;
    treatment_id?: string;
    invoice_id?: string;
    quantity_used?: number;
    discount_applied?: number;
    notes?: string;
    used_on?: string;
}
