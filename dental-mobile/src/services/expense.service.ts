import api from './api';
import type { Expense, ExpenseCategory, ExpensePaymentMode, PaginatedResponse } from '../types';

export const expenseService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: string;
    payment_mode?: ExpensePaymentMode;
    branch_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedResponse<Expense>> => {
    const { data } = await api.get<PaginatedResponse<Expense>>('/expenses', {
      params: { page: 1, limit: 20, ...params },
    });
    if (data?.data && data?.meta) return data;
    return { data: Array.isArray(data) ? data : [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } };
  },

  get: async (id: string): Promise<Expense> => {
    const { data } = await api.get<Expense>(`/expenses/${id}`);
    return data;
  },

  getCategories: async (): Promise<ExpenseCategory[]> => {
    const { data } = await api.get<ExpenseCategory[]>('/expense-categories');
    return Array.isArray(data) ? data : [];
  },

  create: async (payload: {
    category_id: string;
    title: string;
    amount: number;
    date: string;
    branch_id?: string;
    payment_mode?: string;
    vendor?: string;
    notes?: string;
    is_recurring?: boolean;
    recurring_frequency?: string;
  }): Promise<Expense> => {
    const { data } = await api.post<Expense>('/expenses', payload);
    return data;
  },

  update: async (
    id: string,
    payload: Partial<{
      category_id: string;
      title: string;
      amount: number;
      date: string;
      branch_id: string;
      payment_mode: string;
      vendor: string;
      notes: string;
      is_recurring: boolean;
      recurring_frequency: string;
    }>,
  ): Promise<Expense> => {
    const { data } = await api.patch<Expense>(`/expenses/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },

  createCategory: async (payload: { name: string; icon?: string }): Promise<ExpenseCategory> => {
    const { data } = await api.post<ExpenseCategory>('/expense-categories', payload);
    return data;
  },

  updateCategory: async (id: string, payload: { name?: string; icon?: string; is_active?: boolean }): Promise<ExpenseCategory> => {
    const { data } = await api.patch<ExpenseCategory>(`/expense-categories/${id}`, payload);
    return data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/expense-categories/${id}`);
  },
};
