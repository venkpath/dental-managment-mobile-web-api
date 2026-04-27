/**
 * Smart Dental Desk billing entity.
 *
 * This is the supplier ("from") on every platform invoice we issue to clinics
 * for their subscription payments. Hard-coded by design — invoicing must NOT
 * depend on per-environment env vars or DB rows that could be silently edited.
 * Update this file (and a fresh deploy) is the only way these change.
 */
export const PLATFORM_BILLER = {
  /** Brand the clinic sees on the invoice — matches the SaaS product name. */
  brandName: 'Smart Dental Desk',
  /** Legal entity that owns the brand and issues the invoice. */
  legalName: 'Yeshika Enterprises',
  /** Goods and Services Tax Identification Number. First two digits = state code (29 = Karnataka). */
  gstin: '29DJBPP2719E1Z7',
  /** State derived from GSTIN[0..2]. Used for CGST+SGST vs. IGST decision. */
  stateCode: '29',
  stateName: 'Karnataka',
  address: {
    line1: 'Flat 313, SJ Pinnacle',
    line2: 'Varthur',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560087',
    country: 'India',
  },
  phone: '+91 73532 30500',
  email: 'billing@smartdentaldesk.com',
  /** Full one-line address for compact PDF/email rendering. */
  addressOneLine:
    'Flat 313, SJ Pinnacle, Varthur, Bangalore - 560087, Karnataka, India',
} as const;

/** GST rate for SaaS — 18% across India (CGST 9 + SGST 9 intra-state, IGST 18 inter-state). */
export const PLATFORM_GST_RATE = 18;

/** Indian state code (first two GSTIN digits) where the supplier is registered. */
export const PLATFORM_STATE_CODE = PLATFORM_BILLER.stateCode;

/**
 * Decide CGST+SGST (intra-state) vs. IGST (inter-state) based on the bill-to
 * state. Falls back to IGST when bill-to state is unknown (safer default for
 * input-tax-credit purposes).
 */
export function isIntraStateBilling(billToStateName: string | null | undefined): boolean {
  if (!billToStateName) return false;
  return billToStateName.trim().toLowerCase() === PLATFORM_BILLER.stateName.toLowerCase();
}
