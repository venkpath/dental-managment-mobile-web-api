import api from './api';

// ─── Request shapes ──────────────────────────────────────────────────────────
export interface ClinicalNotesRequest {
  patient_id: string;
  dentist_notes: string;
  chief_complaint?: string;
}

export interface PrescriptionRequest {
  patient_id: string;
  diagnosis: string;
  chief_complaint?: string;
  past_dental_history?: string;
  allergies_medical_history?: string;
  procedures_performed?: string;
  tooth_numbers?: string[];
  existing_medications?: string;
  branch_id?: string;
}

export interface TreatmentPlanRequest {
  patient_id: string;
  chief_complaint: string;
  dentist_notes: string;
}

// ─── Response shapes ─────────────────────────────────────────────────────────
export interface IcdCode { code: string; description: string }

export interface ClinicalNotesResponse {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  additional_notes?: string;
  icd_codes?: IcdCode[];
  teeth_involved?: string[];
  procedures_performed?: string[];
  follow_up?: string;
  review_after_days?: number;
  patient_id: string;
  patient_name?: string;
  generated_at: string;
  insight_id?: string;
}

export interface AiMedication {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  purpose?: string;
  in_stock?: boolean;
  inventory_id?: string | null;
}

export interface PrescriptionResponse {
  medications: AiMedication[];
  warnings?: string[];
  interactions?: string[];
  post_procedure_instructions?: string[];
  dietary_advice?: string;
  follow_up?: string;
  patient_id: string;
  patient_name?: string;
  generated_at: string;
  insight_id?: string;
}

export interface TreatmentPlanAlternative {
  procedure: string;
  pros: string;
  cons: string;
}

export interface TreatmentPlanTreatment {
  tooth: string;
  condition: string;
  procedure: string;
  urgency: string;
  estimated_sessions: number;
  rationale: string;
  alternatives?: TreatmentPlanAlternative[];
}

export interface TreatmentPlanPhase {
  phase_number: number;
  phase_name: string;
  priority: string;
  treatments: TreatmentPlanTreatment[];
}

export interface TreatmentPlanResponse {
  summary: string;
  risk_level: 'low' | 'moderate' | 'high' | 'critical' | string;
  phases: TreatmentPlanPhase[];
  preventive_recommendations?: string[];
  estimated_total_sessions?: number;
  follow_up_schedule?: string;
  notes?: string;
  patient_id: string;
  patient_name?: string;
  generated_at: string;
  insight_id?: string;
}

// ─── Chart Analysis ──────────────────────────────────────────────────────────
export interface QuadrantAnalysis {
  quadrant: 'UR' | 'UL' | 'LR' | 'LL' | string;
  status: 'healthy' | 'attention' | 'at_risk' | 'critical' | string;
  conditions: number;
}

export interface RiskFactor {
  severity: 'high' | 'medium' | 'low' | string;
  factor: string;
  affected_teeth?: string[];
  recommendation?: string;
}

export interface ExpenseAdvisorChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExpenseAdvisorResponse {
  response: string;
  suggestions: string[];
  generated_at: string;
}

export interface ChartAnalysisResponse {
  oral_health_score: number;          // 0–100
  overall_risk: 'low' | 'moderate' | 'high' | 'critical' | string;
  summary: string;
  quadrant_analysis?: QuadrantAnalysis[];
  immediate_attention?: string[];
  risk_factors?: RiskFactor[];
  preventive_alerts?: string[];
  next_visit_focus?: string;
  generated_at: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────
const AI_TIMEOUT_MS = 90_000;

export const aiService = {
  generateClinicalNotes: async (payload: ClinicalNotesRequest): Promise<ClinicalNotesResponse> => {
    const { data } = await api.post<ClinicalNotesResponse>('/ai/clinical-notes', payload, {
      timeout: AI_TIMEOUT_MS,
    });
    return data;
  },

  generatePrescription: async (payload: PrescriptionRequest): Promise<PrescriptionResponse> => {
    const { data } = await api.post<PrescriptionResponse>('/ai/prescription', payload, {
      timeout: AI_TIMEOUT_MS,
    });
    return data;
  },

  generateTreatmentPlan: async (payload: TreatmentPlanRequest): Promise<TreatmentPlanResponse> => {
    const { data } = await api.post<TreatmentPlanResponse>('/ai/treatment-plan', payload, {
      timeout: AI_TIMEOUT_MS,
    });
    return data;
  },

  generateChartAnalysis: async (patientId: string): Promise<ChartAnalysisResponse> => {
    const { data } = await api.post<ChartAnalysisResponse>(
      '/ai/generateChartAnalysis',
      { patient_id: patientId },
      { timeout: AI_TIMEOUT_MS },
    );
    return data;
  },

  expenseAdvisorChat: async (payload: {
    message: string;
    history?: ExpenseAdvisorChatMessage[];
    branch_id?: string;
  }): Promise<ExpenseAdvisorResponse> => {
    const { data } = await api.post<ExpenseAdvisorResponse>('/ai/expense-advisor', payload, {
      timeout: AI_TIMEOUT_MS,
    });
    return data;
  },
};
