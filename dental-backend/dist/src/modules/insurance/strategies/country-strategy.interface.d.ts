import { Prisma } from '@prisma/client';
export interface CoverageBreakdownLine {
    description: string;
    clinic_rate: number;
    approved_rate: number;
    coverage_pct: number;
    insurance_portion: number;
    patient_portion: number;
}
export interface CoverageBreakdown {
    currency: string;
    lines: CoverageBreakdownLine[];
    insurance_total: number;
    patient_copay_total: number;
    invoice_total: number;
    notes: string[];
}
export interface EligibilityResult {
    is_covered: boolean;
    reasons: string[];
    warnings: string[];
    requires_preauth: boolean;
    requires_referral: boolean;
}
export interface ClaimFormContext {
    [key: string]: unknown;
}
export interface CountryInsuranceStrategy {
    readonly country: string;
    calculateCoverage(input: {
        plan: PlanForCalc;
        items: ItemForCalc[];
    }): CoverageBreakdown;
    checkEligibility(input: {
        plan: PlanForCalc;
        patientCoverageStart?: Date | null;
        patientCoverageEnd?: Date | null;
        clinicEmpanelmentStatus?: string | null;
        clinicEmpanelmentValidTo?: Date | null;
    }): EligibilityResult;
    renderClaimForm(ctx: ClaimFormContext): Promise<Buffer>;
}
export type PlanForCalc = {
    currency: string;
    preventive_coverage: number;
    basic_coverage: number;
    major_coverage: number;
    ortho_coverage: number;
    annual_max_amount: Prisma.Decimal | number | null;
    deductible_amount: Prisma.Decimal | number;
    requires_preauth: boolean;
    requires_referral: boolean;
    coverage_rules: Prisma.JsonValue;
    provider_country: string;
    provider_short_code: string;
};
export type ItemForCalc = {
    description: string;
    category: 'preventive' | 'basic' | 'major' | 'ortho' | 'emergency';
    clinic_rate: number;
    scheme_max_fee?: number | null;
    quantity?: number;
};
