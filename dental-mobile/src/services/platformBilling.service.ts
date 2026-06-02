import api from './api';

export type PlatformInvoiceStatus =
  | 'draft' | 'due' | 'overdue' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface PlatformInvoice {
  id: string;
  invoice_number: string;
  plan_name: string;
  billing_cycle: string;
  period_start: string;
  period_end: string;
  total_amount: string | number;
  currency: string;
  status: PlatformInvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  issued_at: string;
}

export const platformBillingService = {
  list: async (params?: { limit?: number; offset?: number }): Promise<{ items: PlatformInvoice[]; total: number }> => {
    const { data } = await api.get<{ items: PlatformInvoice[]; total: number }>('/platform-billing/invoices', {
      params,
    });
    return data;
  },

  listOutstanding: async (): Promise<PlatformInvoice[]> => {
    const { data } = await api.get<PlatformInvoice[]>('/platform-billing/invoices/outstanding');
    return data;
  },

  getPayLink: async (id: string): Promise<{ url: string }> => {
    const { data } = await api.get<{ url: string }>(`/platform-billing/invoices/${id}/pay-link`);
    return data;
  },

  getPdfUrl: async (id: string): Promise<{ url: string; filename: string }> => {
    const { data } = await api.get<{ url: string; filename: string }>(`/platform-billing/invoices/${id}/pdf`);
    return data;
  },
};
