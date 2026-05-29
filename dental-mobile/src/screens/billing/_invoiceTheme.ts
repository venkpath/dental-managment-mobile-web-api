import type { Invoice } from '../../types';

/** Shared tokens for all invoice screens (list, detail, create, edit). */
export const C = {
  indigo: '#4361EE',
  indigoLight: '#EEF2FF',
  green: '#059669',
  greenLight: '#d1fae5',
  amber: '#d97706',
  amberLight: '#fef3c7',
  red: '#dc2626',
  redLight: '#fee2e2',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  teal: '#0891b2',
  tealLight: '#ecfeff',
  gray: '#64748b',
  grayLight: '#f1f5f9',
  bg: '#F8FAFC',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#475569',
  textMuted: '#94a3b8',
  border: '#E2E8F0',
  divider: '#EEF2F6',
};

export const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const COVERAGE_CATEGORIES = [
  { value: '', label: 'Default (basic)' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'basic', label: 'Basic' },
  { value: 'major', label: 'Major' },
  { value: 'ortho', label: 'Ortho' },
  { value: 'emergency', label: 'Emergency' },
] as const;

export const ITEM_TYPE_OPTIONS = [
  { value: 'treatment' as const, label: 'Treatment', icon: 'medical-outline' as const },
  { value: 'service' as const, label: 'Service', icon: 'construct-outline' as const },
  { value: 'pharmacy' as const, label: 'Pharmacy', icon: 'medkit-outline' as const },
];

export function invoiceStatusMeta(status: Invoice['status']) {
  switch (status) {
    case 'paid': return { bg: C.greenLight, fg: C.green, label: 'Paid', icon: 'checkmark-circle' as const };
    case 'pending': return { bg: C.amberLight, fg: C.amber, label: 'Pending', icon: 'time' as const };
    case 'partially_paid': return { bg: C.tealLight, fg: C.teal, label: 'Partially Paid', icon: 'sync' as const };
    case 'partially_refunded': return { bg: C.redLight, fg: C.red, label: 'Part. Refunded', icon: 'arrow-undo' as const };
    case 'refunded': return { bg: C.grayLight, fg: C.gray, label: 'Refunded', icon: 'arrow-undo' as const };
    default: return { bg: C.indigoLight, fg: C.indigo, label: status, icon: 'document' as const };
  }
}

export function invoiceIconColors(status: Invoice['status']) {
  switch (status) {
    case 'paid': return { bg: C.greenLight, icon: C.green };
    case 'pending': return { bg: C.amberLight, icon: C.amber };
    case 'partially_paid': return { bg: C.tealLight, icon: C.teal };
    case 'partially_refunded': return { bg: C.redLight, icon: C.red };
    case 'refunded': return { bg: C.grayLight, icon: C.gray };
    default: return { bg: C.indigoLight, icon: C.indigo };
  }
}

export function lifecycleBanner(lifecycle?: string | null) {
  if (lifecycle === 'draft') return { bg: C.amberLight, fg: C.amber, label: 'Draft', icon: 'document-outline' as const };
  if (lifecycle === 'cancelled') return { bg: C.redLight, fg: C.red, label: 'Cancelled', icon: 'close-circle-outline' as const };
  return null;
}
