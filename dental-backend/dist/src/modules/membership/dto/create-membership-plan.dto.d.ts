export declare class CreateMembershipBenefitDto {
    title: string;
    description?: string;
    benefit_type: string;
    treatment_label?: string;
    coverage_scope?: string;
    included_quantity?: number;
    discount_percentage?: number;
    discount_amount?: number;
    credit_amount?: number;
    display_order?: number;
    is_active?: boolean;
}
export declare class CreateMembershipPlanDto {
    code?: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    duration_months?: number;
    covered_members_limit?: number;
    grace_period_days?: number;
    is_active?: boolean;
    terms_and_conditions?: string;
    benefits: CreateMembershipBenefitDto[];
}
