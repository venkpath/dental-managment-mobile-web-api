/** Public legal & support URLs (marketing site). */
export const LEGAL_BASE_URL = 'https://smartdentaldesk.com';

export const TERMS_URL = `${LEGAL_BASE_URL}/terms`;
export const PRIVACY_URL = `${LEGAL_BASE_URL}/privacy`;
export const REFUND_URL = `${LEGAL_BASE_URL}/refund`;

export const SUPPORT_EMAIL = 'support@smartdentaldesk.com';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export type LegalLinkKind = 'terms' | 'privacy' | 'refund';

export const LEGAL_URLS: Record<LegalLinkKind, string> = {
  terms: TERMS_URL,
  privacy: PRIVACY_URL,
  refund: REFUND_URL,
};
