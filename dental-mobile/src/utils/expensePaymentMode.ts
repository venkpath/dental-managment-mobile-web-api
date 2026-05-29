import type { ExpensePaymentMode } from '../types';

const LABELS: Record<ExpensePaymentMode, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  card: 'Card',
  cheque: 'Cheque',
};

export function expensePaymentModeLabel(mode?: string | null): string {
  if (!mode) return '—';
  return LABELS[mode as ExpensePaymentMode] ?? mode.replace(/_/g, ' ');
}

export const PAYMENT_MODE_FILTERS: { key: string; label: string; mode?: ExpensePaymentMode }[] = [
  { key: 'all', label: 'All modes' },
  { key: 'cash', label: 'Cash', mode: 'cash' },
  { key: 'upi', label: 'UPI', mode: 'upi' },
  { key: 'card', label: 'Card', mode: 'card' },
  { key: 'bank_transfer', label: 'Bank', mode: 'bank_transfer' },
  { key: 'cheque', label: 'Cheque', mode: 'cheque' },
];
