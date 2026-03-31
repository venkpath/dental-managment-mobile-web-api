import api from './api';
import type { Invoice, PaginatedResponse } from '../types';

export const invoiceService = {
  list: async (params?: { page?: number; status?: string; patient_id?: string }): Promise<PaginatedResponse<Invoice>> => {
    const { data } = await api.get('/invoices', {
      params: { page: 1, limit: 20, ...params },
    });
    return data;
  },

  get: async (id: string): Promise<Invoice> => {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },

  create: async (payload: {
    patient_id: string;
    branch_id: string;
    tax_percentage?: number;
    discount_amount?: number;
    items: Array<{
      item_type: 'treatment' | 'service' | 'pharmacy';
      description: string;
      quantity: number;
      unit_price: number;
      treatment_id?: string;
    }>;
  }): Promise<Invoice> => {
    const { data } = await api.post<Invoice>('/invoices', payload);
    return data;
  },

  recordPayment: async (
    invoiceId: string,
    payload: { amount: number; method: 'cash' | 'card' | 'upi'; notes?: string; installment_item_id?: string }
  ): Promise<void> => {
    await api.post(`/payments`, { invoice_id: invoiceId, ...payload });
  },

  createInstallmentPlan: async (
    invoiceId: string,
    payload: {
      notes?: string;
      items: Array<{ installment_number: number; amount: number; due_date: string }>;
    }
  ): Promise<void> => {
    await api.post(`/invoices/${invoiceId}/installment-plan`, payload);
  },

  deleteInstallmentPlan: async (invoiceId: string): Promise<void> => {
    await api.delete(`/invoices/${invoiceId}/installment-plan`);
  },
};
