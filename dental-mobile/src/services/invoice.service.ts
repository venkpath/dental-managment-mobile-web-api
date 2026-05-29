import api from './api';
import type { CoverageCategory, Invoice, PaginatedResponse } from '../types';

export type CreateInvoiceItem = {
  item_type: 'treatment' | 'service' | 'pharmacy';
  description: string;
  quantity: number;
  unit_price: number;
  treatment_id?: string;
  coverage_category?: CoverageCategory;
  scheme_max_fee?: number;
};

export type CreateInvoicePayload = {
  patient_id: string;
  branch_id: string;
  dentist_id?: string;
  treatment_date?: string;
  tax_percentage?: number;
  discount_amount?: number;
  gst_number?: string;
  as_draft?: boolean;
  patient_insurance_id?: string;
  override_insurance_covered_amount?: number;
  override_patient_copay_amount?: number;
  items: CreateInvoiceItem[];
};

export const invoiceService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    patient_id?: string;
    lifecycle_status?: string;
  }): Promise<PaginatedResponse<Invoice>> => {
    const { data } = await api.get('/invoices', {
      params: { page: 1, limit: 20, ...params },
    });
    return data;
  },

  get: async (id: string): Promise<Invoice> => {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },

  create: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const { data } = await api.post<Invoice>('/invoices', payload);
    return data;
  },

  recordPayment: async (
    invoiceId: string,
    payload: { amount: number; method: 'cash' | 'card' | 'upi'; notes?: string; installment_item_id?: string },
  ): Promise<void> => {
    await api.post('/payments', { invoice_id: invoiceId, ...payload });
  },

  refund: async (
    invoiceId: string,
    payload: { amount: number; method: 'cash' | 'card' | 'upi' | 'bank_transfer'; reason?: string; payment_id?: string },
  ): Promise<void> => {
    await api.post(`/invoices/${invoiceId}/refunds`, payload);
  },

  createInstallmentPlan: async (
    invoiceId: string,
    payload: {
      notes?: string;
      items: Array<{ installment_number: number; amount: number; due_date: string }>;
    },
  ): Promise<void> => {
    await api.post(`/invoices/${invoiceId}/installment-plan`, payload);
  },

  deleteInstallmentPlan: async (invoiceId: string): Promise<void> => {
    await api.delete(`/invoices/${invoiceId}/installment-plan`);
  },

  getPdfUrl: async (invoiceId: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/invoices/${invoiceId}/pdf`);
    return data.url;
  },

  sendWhatsApp: async (invoiceId: string): Promise<void> => {
    await api.post(`/invoices/${invoiceId}/send-whatsapp`);
  },

  update: async (
    invoiceId: string,
    payload: { dentist_id?: string | null; gst_number?: string },
  ): Promise<Invoice> => {
    const { data } = await api.patch<Invoice>(`/invoices/${invoiceId}`, payload);
    return data;
  },
};
