import api from './api';

export interface InsightSummary {
  no_show: { high: number; medium: number; total: number };
  recall: { total: number };
  churn: { high: number; medium: number; total: number };
  conversion: { total: number; potential_revenue: number };
  total_at_risk: number;
  outreach_recent?: number;
  attributed_bookings?: number;
  attribution_window_days?: number;
  campaign_cooldown_days?: number;
  confidence_score: number;
  last_computed_at: string | null;
}

export type InsightActionType = 'recall' | 'churn';
export type InsightAction = 'contacted' | 'snooze' | 'move_inactive' | 'decline';

export type InsightListType = 'no_show' | 'recall' | 'churn' | 'conversion';

export interface InsightPatientRow {
  patient_id: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  no_show_risk?: string;
  no_show_score?: number;
  churn_risk?: string;
  churn_score?: number;
  recall_due?: boolean;
  recall_due_days?: number;
  conversion_score?: number;
}

interface ChurnRow { patient_id: string; churn_risk: 'high' | 'medium' | 'low' }
interface ChurnListResponse { data: ChurnRow[]; total: number }

interface InsightListResponse {
  data: InsightPatientRow[];
  total: number;
  limit: number;
  offset: number;
}

export const insightsService = {
  getSummary: async (): Promise<InsightSummary> => {
    const { data } = await api.get<InsightSummary>('/patient-insights/summary');
    return data;
  },

  /** Returns a Set of patient IDs flagged with HIGH churn risk for quick row-level lookup. */
  getList: async (params: {
    type: InsightListType;
    limit?: number;
    offset?: number;
    branch_id?: string;
  }): Promise<InsightListResponse> => {
    const { data } = await api.get<InsightListResponse>('/patient-insights/list', { params });
    return data;
  },

  compute: async (branchId?: string): Promise<{ batch_id: string; patient_count: number }> => {
    const { data } = await api.post<{ batch_id: string; patient_count: number }>(
      '/patient-insights/compute',
      {},
      { params: branchId ? { branch_id: branchId } : {} },
    );
    return data;
  },

  recordAction: async (
    patientId: string,
    body: { type: InsightActionType; action: InsightAction; snooze_days?: number },
  ): Promise<void> => {
    await api.patch(`/patient-insights/patient/${patientId}/action`, body);
  },

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
