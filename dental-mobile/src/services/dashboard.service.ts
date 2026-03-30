import api from './api';
import type { DashboardSummary } from '../types';

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get<DashboardSummary>('/reports/dashboard-summary');
    return data;
  },
};
