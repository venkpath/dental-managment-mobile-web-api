"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndiaInsuranceStrategy = void 0;
const common_1 = require("@nestjs/common");
let IndiaInsuranceStrategy = class IndiaInsuranceStrategy {
    country = 'IN';
    calculateCoverage(input) {
        const { plan, items } = input;
        const usesCghsRates = this.usesCghsRates(plan);
        const annualMax = this.toNumber(plan.annual_max_amount);
        const deductible = this.toNumber(plan.deductible_amount) ?? 0;
        const lines = [];
        const notes = [];
        let runningInsurance = 0;
        let runningPatient = 0;
        for (const item of items) {
            const qty = item.quantity ?? 1;
            const clinicRate = item.clinic_rate * qty;
            const schemeFee = item.scheme_max_fee != null ? item.scheme_max_fee * qty : null;
            let approvedRate = clinicRate;
            if (usesCghsRates && schemeFee != null) {
                approvedRate = Math.min(clinicRate, schemeFee);
            }
            const coveragePct = this.coveragePctForCategory(plan, item.category);
            let insurancePortion = (approvedRate * coveragePct) / 100;
            let patientPortion = clinicRate - insurancePortion;
            if (usesCghsRates) {
                patientPortion = Math.max(0, clinicRate - approvedRate);
                insurancePortion = approvedRate;
            }
            lines.push({
                description: item.description,
                clinic_rate: round2(clinicRate),
                approved_rate: round2(approvedRate),
                coverage_pct: usesCghsRates ? 100 : coveragePct,
                insurance_portion: round2(insurancePortion),
                patient_portion: round2(patientPortion),
            });
            runningInsurance += insurancePortion;
            runningPatient += patientPortion;
        }
        if (!usesCghsRates && deductible > 0) {
            const deductibleApplied = Math.min(deductible, runningInsurance);
            runningInsurance -= deductibleApplied;
            runningPatient += deductibleApplied;
            notes.push(`Deductible of ₹${deductible.toFixed(2)} applied — patient pays this portion first.`);
        }
        if (annualMax != null && runningInsurance > annualMax) {
            const cappedAt = annualMax;
            const excess = runningInsurance - cappedAt;
            runningInsurance = cappedAt;
            runningPatient += excess;
            notes.push(`Annual maximum of ₹${cappedAt.toFixed(2)} reached — remainder billed to patient.`);
        }
        if (usesCghsRates) {
            notes.push('Billed at CGHS approved rates. Patient co-pay applies only to items above CGHS schedule.');
        }
        if (plan.requires_preauth) {
            notes.push('Pre-authorization required from the scheme office before treatment.');
        }
        if (plan.requires_referral) {
            notes.push('Referral letter required from CGHS dispensary / polyclinic / employer.');
        }
        const insuranceTotal = round2(runningInsurance);
        const patientTotal = round2(runningPatient);
        return {
            currency: plan.currency || 'INR',
            lines,
            insurance_total: insuranceTotal,
            patient_copay_total: patientTotal,
            invoice_total: round2(insuranceTotal + patientTotal),
            notes,
        };
    }
    checkEligibility(input) {
        const reasons = [];
        const warnings = [];
        let isCovered = true;
        const now = new Date();
        if (input.patientCoverageEnd && input.patientCoverageEnd < now) {
            isCovered = false;
            reasons.push('Patient insurance card has expired.');
        }
        else if (input.patientCoverageEnd) {
            const days = daysUntil(input.patientCoverageEnd);
            if (days <= 30)
                warnings.push(`Card expires in ${days} day(s) — renew soon.`);
        }
        if (input.patientCoverageStart && input.patientCoverageStart > now) {
            isCovered = false;
            reasons.push('Coverage has not started yet.');
        }
        const usesCghsRates = this.usesCghsRates(input.plan);
        if (usesCghsRates) {
            if (!input.clinicEmpanelmentStatus || input.clinicEmpanelmentStatus !== 'ACTIVE') {
                isCovered = false;
                reasons.push(`Clinic is not empanelled with ${input.plan.provider_short_code} — direct billing unavailable. Patient may still claim reimbursement from the scheme.`);
            }
            if (input.clinicEmpanelmentValidTo && input.clinicEmpanelmentValidTo < now) {
                isCovered = false;
                reasons.push('Clinic empanelment has expired — renew with the scheme office.');
            }
        }
        if (isCovered) {
            reasons.push(`Patient is covered under ${input.plan.provider_short_code}.`);
            if (usesCghsRates)
                reasons.push('Direct billing available — bill at scheme rates.');
        }
        return {
            is_covered: isCovered,
            reasons,
            warnings,
            requires_preauth: input.plan.requires_preauth,
            requires_referral: input.plan.requires_referral,
        };
    }
    async renderClaimForm(_ctx) {
        throw new Error('Claim form rendering is implemented in the claim-submission sprint (Phase 2).');
    }
    usesCghsRates(plan) {
        const rules = (plan.coverage_rules ?? {});
        return rules['uses_cghs_rates'] === true;
    }
    coveragePctForCategory(plan, category) {
        switch (category) {
            case 'preventive': return plan.preventive_coverage;
            case 'basic': return plan.basic_coverage;
            case 'major': return plan.major_coverage;
            case 'ortho': return plan.ortho_coverage;
            case 'emergency': return plan.basic_coverage;
            default: return plan.basic_coverage;
        }
    }
    toNumber(v) {
        if (v == null)
            return null;
        if (typeof v === 'number')
            return v;
        if (typeof v === 'string')
            return Number(v);
        if (typeof v === 'object' && v !== null && 'toNumber' in v && typeof v.toNumber === 'function') {
            return v.toNumber();
        }
        return null;
    }
};
exports.IndiaInsuranceStrategy = IndiaInsuranceStrategy;
exports.IndiaInsuranceStrategy = IndiaInsuranceStrategy = __decorate([
    (0, common_1.Injectable)()
], IndiaInsuranceStrategy);
function round2(n) {
    return Math.round(n * 100) / 100;
}
function daysUntil(d) {
    return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
//# sourceMappingURL=india.strategy.js.map