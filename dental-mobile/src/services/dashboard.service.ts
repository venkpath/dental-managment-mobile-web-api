import api from './api';
import type { DashboardSummary, DashboardBootstrap, PaymentBreakdown, SparklineDay } from '../types';

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get<DashboardSummary>('/reports/dashboard-summary');
    return data;
  },

  getBootstrap: async (days: number = 7): Promise<DashboardBootstrap> => {
    const { data } = await api.get<DashboardBootstrap>('/reports/dashboard-bootstrap', {
      params: { days },
    });
    return data;
  },

  getPaymentBreakdown: async (): Promise<PaymentBreakdown> => {
    const { data } = await api.get<PaymentBreakdown>('/reports/payment-breakdown-today');
    return data;
  },

  getSparklines: async (days: number): Promise<{ daily: SparklineDay[] }> => {
    const { data } = await api.get<{ daily: SparklineDay[] }>('/reports/sparklines', {
      params: { days },
    });
    return data;
  },
};
