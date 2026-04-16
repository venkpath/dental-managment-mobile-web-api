export declare class MembershipEnrollmentMemberDto {
    patient_id: string;
    relation_label?: string;
}
export declare class CreateMembershipEnrollmentDto {
    membership_plan_id: string;
    branch_id: string;
    primary_patient_id: string;
    start_date: string;
    end_date?: string;
    amount_paid?: number;
    notes?: string;
    members?: MembershipEnrollmentMemberDto[];
}
