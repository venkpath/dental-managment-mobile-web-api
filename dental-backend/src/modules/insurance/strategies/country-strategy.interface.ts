/**
 * Country-specific insurance behaviour lives behind this interface.
 *
 * Goal: keep the shared workflow (data model, lifecycle, attachments,
 * reporting) free of `if (country === 'IN') ...` branches. Each market
 * (India, USA, Canada, ...) implements its own strategy class; the factory
 * picks one based on the provider's country code.
 *
 * Methods that are not relevant for a country (e.g. CDT codes for India)
 * return empty / no-op results — never throw — so the shared code stays
 * country-agnostic.
 */

import { Prisma } from '@prisma/client';

export interface CoverageBreakdownLine {
  description: string;
  clinic_rate: number;
  approved_rate: number; // scheme-approved / network UCR fee
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
  notes: string[]; // human-readable rule explanations ("Capped at annual max ₹10,000")
}

export interface EligibilityResult {
  is_covered: boolean;
  reasons: string[]; // why or why not
  warnings: string[]; // expiry approaching, etc.
  requires_preauth: boolean;
  requires_referral: boolean;
}

export interface ClaimFormContext {
  // Used by the strategy to render a scheme-specific claim PDF.
  // Concrete shape kept loose — claim service hydrates it with the full
  // claim + invoice + treatments + provider record before calling.
  [key: string]: unknown;
}

export interface CountryInsuranceStrategy {
  /** ISO 3166-1 alpha-2 country code this strategy handles. */
  readonly country: string;

  /**
   * Compute what the insurer pays vs the patient pays for an invoice.
   * `invoiceItems` carry per-line amounts + category; the strategy applies
   * scheme rate caps (CGHS), deductible/coinsurance (USA PPO), annual max,
   * etc.
   */
  calculateCoverage(input: {
    plan: PlanForCalc;
    items: ItemForCalc[];
  }): CoverageBreakdown;

  /**
   * Quick eligibility view for the appointment banner / invoice header.
   * Pure function over the patient's enrollment + clinic empanelment.
   */
  checkEligibility(input: {
    plan: PlanForCalc;
    patientCoverageStart?: Date | null;
    patientCoverageEnd?: Date | null;
    clinicEmpanelmentStatus?: string | null;
    clinicEmpanelmentValidTo?: Date | null;
  }): EligibilityResult;

  /**
   * Render the scheme-specific claim form (CGHS Form, ADA 2019, CDA, ...).
   * Returns a PDF buffer. Implementations may share a generic Handlebars
   * template registry under `templates/claim-forms/{country}/{short_code}.hbs`.
   */
  renderClaimForm(ctx: ClaimFormContext): Promise<Buffer>;
}

// ─── Plain shapes passed into the strategy ───────────────────────────────
// Kept decoupled from Prisma types so unit tests don't need a DB.

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
  scheme_max_fee?: number | null; // CGHS rate / UCR fee if set
  quantity?: number;
};
