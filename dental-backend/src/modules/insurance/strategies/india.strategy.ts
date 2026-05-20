import { Injectable } from '@nestjs/common';
import type {
  ClaimFormContext,
  CountryInsuranceStrategy,
  CoverageBreakdown,
  CoverageBreakdownLine,
  EligibilityResult,
  ItemForCalc,
  PlanForCalc,
} from './country-strategy.interface.js';

/**
 * India strategy — handles CGHS, ECHS, ESI, Ayushman Bharat, corporate EHS,
 * and private group health policies (Star Health, HDFC ERGO, Niva Bupa, Care).
 *
 * Key India quirks:
 *  - CGHS / ECHS: the clinic must bill at CGHS rate-card prices, not its own
 *    MRP. The patient typically pays nothing (pensioners) or a small co-pay.
 *    Detected via `coverage_rules.uses_cghs_rates === true`.
 *  - Private group insurers (Star/HDFC/Niva): standard preventive/basic/major
 *    coverage % with annual cap + deductible.
 *  - All amounts are INR.
 */
@Injectable()
export class IndiaInsuranceStrategy implements CountryInsuranceStrategy {
  readonly country = 'IN';

  calculateCoverage(input: { plan: PlanForCalc; items: ItemForCalc[] }): CoverageBreakdown {
    const { plan, items } = input;
    const usesCghsRates = this.usesCghsRates(plan);

    const annualMax = this.toNumber(plan.annual_max_amount);
    const deductible = this.toNumber(plan.deductible_amount) ?? 0;

    const lines: CoverageBreakdownLine[] = [];
    const notes: string[] = [];
    let runningInsurance = 0;
    let runningPatient = 0;

    for (const item of items) {
      const qty = item.quantity ?? 1;
      const clinicRate = item.clinic_rate * qty;
      const schemeFee = item.scheme_max_fee != null ? item.scheme_max_fee * qty : null;

      // CGHS/ECHS: approved amount is capped at scheme rate; patient pays nil.
      // Private insurance: approved = full clinic rate, % applies.
      let approvedRate = clinicRate;
      if (usesCghsRates && schemeFee != null) {
        approvedRate = Math.min(clinicRate, schemeFee);
      }

      const coveragePct = this.coveragePctForCategory(plan, item.category);
      let insurancePortion = (approvedRate * coveragePct) / 100;
      let patientPortion = clinicRate - insurancePortion;

      // CGHS/ECHS patient pays the *gap* between clinic rate and scheme rate
      // (out-of-pocket only when clinic over-charges; usually zero because
      // empanelled clinics bill at CGHS rates).
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

    // Apply deductible (private insurance only). CGHS patients never have one.
    if (!usesCghsRates && deductible > 0) {
      const deductibleApplied = Math.min(deductible, runningInsurance);
      runningInsurance -= deductibleApplied;
      runningPatient += deductibleApplied;
      notes.push(`Deductible of ₹${deductible.toFixed(2)} applied — patient pays this portion first.`);
    }

    // Apply annual maximum cap.
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

  checkEligibility(input: {
    plan: PlanForCalc;
    patientCoverageStart?: Date | null;
    patientCoverageEnd?: Date | null;
    clinicEmpanelmentStatus?: string | null;
    clinicEmpanelmentValidTo?: Date | null;
  }): EligibilityResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let isCovered = true;

    const now = new Date();

    if (input.patientCoverageEnd && input.patientCoverageEnd < now) {
      isCovered = false;
      reasons.push('Patient insurance card has expired.');
    } else if (input.patientCoverageEnd) {
      const days = daysUntil(input.patientCoverageEnd);
      if (days <= 30) warnings.push(`Card expires in ${days} day(s) — renew soon.`);
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
      if (usesCghsRates) reasons.push('Direct billing available — bill at scheme rates.');
    }

    return {
      is_covered: isCovered,
      reasons,
      warnings,
      requires_preauth: input.plan.requires_preauth,
      requires_referral: input.plan.requires_referral,
    };
  }

  async renderClaimForm(_ctx: ClaimFormContext): Promise<Buffer> {
    // Implementation lands in the claim-submission sprint — uses Handlebars
    // templates under src/modules/insurance/templates/claim-forms/in/.
    // Throw a clear error so callers in the meantime know it's unfinished.
    throw new Error('Claim form rendering is implemented in the claim-submission sprint (Phase 2).');
  }

  // ─── private helpers ───────────────────────────────────────────────────

  private usesCghsRates(plan: PlanForCalc): boolean {
    const rules = (plan.coverage_rules ?? {}) as Record<string, unknown>;
    return rules['uses_cghs_rates'] === true;
  }

  private coveragePctForCategory(plan: PlanForCalc, category: ItemForCalc['category']): number {
    switch (category) {
      case 'preventive': return plan.preventive_coverage;
      case 'basic': return plan.basic_coverage;
      case 'major': return plan.major_coverage;
      case 'ortho': return plan.ortho_coverage;
      case 'emergency': return plan.basic_coverage; // treat like basic
      default: return plan.basic_coverage;
    }
  }

  private toNumber(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(v);
    // Prisma.Decimal has a toNumber() method
    if (typeof v === 'object' && v !== null && 'toNumber' in v && typeof (v as { toNumber: () => number }).toNumber === 'function') {
      return (v as { toNumber: () => number }).toNumber();
    }
    return null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
