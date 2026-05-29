import api from './api';

// ─── Types (shape mirrors web responses, kept light) ─────────────────────────
export interface ClinicalVisit {
  id: string;
  patient_id: string;
  dentist_id?: string;
  branch_id?: string;
  visit_date?: string;
  chief_complaint?: string;
  past_dental_history?: string;
  medical_history_notes?: string;
  examination_notes?: string;
  diagnosis_summary?: string;
  status?: 'in_progress' | 'finalized' | 'cancelled' | string;
  review_date?: string | null;
  review_after_date?: string | null;
  finalized_at?: string | null;
  dentist?: { id: string; name: string };
  branch?: { id: string; name: string };
  patient?: { id: string; first_name: string; last_name: string; phone?: string };
  created_at: string;
}

export interface TreatmentPlanItem {
  id: string;
  procedure: string;
  tooth_number?: string;
  urgency?: 'immediate' | 'high' | 'medium' | 'low' | string;
}

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | string;
  total_estimated_cost?: number;
  items?: TreatmentPlanItem[];
  created_at: string;
}

// ─── Create/Update payloads ──────────────────────────────────────────────────

export interface CreateVisitPayload {
  patient_id: string;
  dentist_id: string;
  branch_id: string;
  chief_complaint?: string;
  past_dental_history?: string;
  medical_history_notes?: string;
  examination_notes?: string;
  diagnosis_summary?: string;
  review_after_date?: string;
}

export interface UpdateVisitPayload {
  chief_complaint?: string;
  past_dental_history?: string;
  medical_history_notes?: string;
  examination_notes?: string;
  diagnosis_summary?: string;
  review_after_date?: string | null;
}

export interface CreatePlanItem {
  procedure: string;
  tooth_number?: string;
  estimated_cost?: number;
  diagnosis?: string;
  urgency?: string;
  phase?: number;
  notes?: string;
}

export interface CreateTreatmentPlanPayload {
  patient_id: string;
  branch_id: string;
  dentist_id: string;
  clinical_visit_id?: string;
  title: string;
  notes?: string;
  items: CreatePlanItem[];
}

// ─── Service ─────────────────────────────────────────────────────────────────
export const clinicalService = {
  getVisitsByPatient: async (patientId: string): Promise<ClinicalVisit[]> => {
    try {
      const { data } = await api.get<ClinicalVisit[] | { data: ClinicalVisit[] }>(
        `/patients/${patientId}/clinical-visits`,
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  getTreatmentPlansByPatient: async (patientId: string): Promise<TreatmentPlan[]> => {
    try {
      const { data } = await api.get<TreatmentPlan[] | { data: TreatmentPlan[] }>(
        `/patients/${patientId}/treatment-plans`,
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  getVisit: async (id: string): Promise<ClinicalVisit | null> => {
    try {
      const { data } = await api.get<ClinicalVisit>(`/clinical-visits/${id}`);
      return data;
    } catch {
      return null;
    }
  },

  createVisit: async (payload: CreateVisitPayload): Promise<ClinicalVisit> => {
    const { data } = await api.post<ClinicalVisit>('/clinical-visits', payload);
    return data;
  },

  updateVisit: async (id: string, payload: UpdateVisitPayload): Promise<ClinicalVisit> => {
    const { data } = await api.patch<ClinicalVisit>(`/clinical-visits/${id}`, payload);
    return data;
  },

  finalizeVisit: async (id: string): Promise<ClinicalVisit> => {
    const { data } = await api.post<ClinicalVisit>(`/clinical-visits/${id}/finalize`, {});
    return data;
  },

  createTreatmentPlan: async (payload: CreateTreatmentPlanPayload): Promise<TreatmentPlan> => {
    const { data } = await api.post<TreatmentPlan>('/treatment-plans', payload);
    return data;
  },

  acceptTreatmentPlan: async (id: string): Promise<TreatmentPlan> => {
    const { data } = await api.post<TreatmentPlan>(`/treatment-plans/${id}/accept`, {});
    return data;
  },
};
