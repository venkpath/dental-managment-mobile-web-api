/**
 * Per-message WhatsApp overage pricing (INR).
 *
 * Charged on top of the plan's included monthly quota
 * (Plan.whatsapp_included_monthly). Only applies when the clinic's plan has
 * `allow_whatsapp_overage_billing = true` — otherwise the hard limit blocks
 * further sends instead of billing.
 *
 * Categories map 1:1 to Meta's WhatsApp template categories:
 *   UTILITY        — transactional confirmations, reminders, receipts, account updates
 *   MARKETING      — promotional offers, recall campaigns, festival greetings
 *   AUTHENTICATION — OTPs and security codes (a.k.a. "OTP" colloquially)
 *
 * Keep these in sync with the marketing page footnote
 * ("WhatsApp messages and AI requests above plan quota are charged extra ·
 *  top-ups available anytime.").
 */
export const WHATSAPP_OVERAGE_PRICE_INR: Readonly<Record<WhatsAppCategory, number>> = Object.freeze({
  UTILITY: 0.4,
  MARKETING: 1.0,
  AUTHENTICATION: 0.3,
});

export type WhatsAppCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

const VALID_CATEGORIES = new Set<WhatsAppCategory>(['UTILITY', 'MARKETING', 'AUTHENTICATION']);

/**
 * Normalises a Meta-returned or template-stored category string into one of the
 * three billable categories. Unknown / null / blank → defaults to UTILITY
 * (safest — lowest price).
 */
export function normalizeWhatsAppCategory(raw: string | null | undefined): WhatsAppCategory {
  if (!raw) return 'UTILITY';
  const upper = raw.toUpperCase();
  // OTP is sometimes used colloquially — Meta's actual category is AUTHENTICATION
  if (upper === 'OTP') return 'AUTHENTICATION';
  return (VALID_CATEGORIES.has(upper as WhatsAppCategory) ? upper : 'UTILITY') as WhatsAppCategory;
}

/**
 * Compute the rupee charge for a given count of messages of a given category.
 */
export function priceForCategory(category: WhatsAppCategory, count: number): number {
  if (count <= 0) return 0;
  return Math.round(count * WHATSAPP_OVERAGE_PRICE_INR[category] * 100) / 100;
}

/**
 * Maps an internal MessageTemplate.category (reminder | greeting | campaign |
 * transactional | follow_up | referral) → Meta WhatsApp category.
 *
 *   campaign, greeting, referral → MARKETING (promotional intent)
 *   reminder, transactional, follow_up → UTILITY (transactional confirmations)
 *
 * Authentication / OTP messages don't use the MessageTemplate model — they go
 * through the auth flow and pass `wa_category: 'AUTHENTICATION'` explicitly via
 * the send DTO metadata.
 */
export function mapInternalCategoryToWa(internalCategory: string | null | undefined): WhatsAppCategory {
  if (!internalCategory) return 'UTILITY';
  const c = internalCategory.toLowerCase();
  if (c === 'campaign' || c === 'greeting' || c === 'referral') return 'MARKETING';
  return 'UTILITY';
}
