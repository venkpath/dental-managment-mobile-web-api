import api from './api';

export interface InsightSummary {
  no_show: { high: number; medium: number; total: number };
  recall: { total: number };
  churn: { high: number; medium: number; total: number };
  conversion: { total: number; potential_revenue: number };
  total_at_risk: number;
  confidence_score: number;
  last_computed_at: string | null;
}

interface ChurnRow { patient_id: string; churn_risk: 'high' | 'medium' | 'low' }
interface ChurnListResponse { data: ChurnRow[]; total: number }

export const insightsService = {
  getSummary: async (): Promise<InsightSummary> => {
    const { data } = await api.get<InsightSummary>('/patient-insights/summary');
    return data;
  },

  /** Returns a Set of patient IDs flagged with HIGH churn risk for quick row-level lookup. */
  getHighChurnPatientIds: async (): Promise<Set<string>> => {
    try {
      const ids = new Set<string>();
      // Backend caps limit at 100; paginate through results
      let offset = 0;
      const limit = 100;
      for (let i = 0; i < 5; i++) { // safety cap: 500 rows max
        const { data } = await api.get<ChurnListResponse>('/patient-insights/list', {
          params: { type: 'churn', limit, offset },
        });
        const rows = data?.data ?? [];
        rows.forEach((r) => {
          if (r.churn_risk === 'high') ids.add(r.patient_id);
        });
        offset += limit;
        if (rows.length < limit) break;
      }
      return ids;
    } catch {
      return new Set();
    }
  },
};
