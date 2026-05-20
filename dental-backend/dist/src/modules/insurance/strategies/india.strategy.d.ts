import type { ClaimFormContext, CountryInsuranceStrategy, CoverageBreakdown, EligibilityResult, ItemForCalc, PlanForCalc } from './country-strategy.interface.js';
export declare class IndiaInsuranceStrategy implements CountryInsuranceStrategy {
    readonly country = "IN";
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
    renderClaimForm(_ctx: ClaimFormContext): Promise<Buffer>;
    private usesCghsRates;
    private coveragePctForCategory;
    private toNumber;
}
