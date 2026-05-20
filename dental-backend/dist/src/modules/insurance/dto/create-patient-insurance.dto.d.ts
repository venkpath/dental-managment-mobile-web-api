declare const RELATIONSHIPS: readonly ["self", "spouse", "child", "parent", "dependent"];
export type Relationship = (typeof RELATIONSHIPS)[number];
export declare class CreatePatientInsuranceDto {
    plan_id: string;
    priority?: number;
    member_id: string;
    group_number?: string;
    employee_id?: string;
    beneficiary_id?: string;
    company_name?: string;
    subscriber_name?: string;
    relationship?: Relationship;
    coverage_start?: string;
    coverage_end?: string;
    is_active?: boolean;
    notes?: string;
}
export {};
