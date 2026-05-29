import api from './api';

export type ToothCondition =
  | 'Cavity' | 'Filled' | 'Crown' | 'Missing' | 'RCT' | 'Implant'
  | 'Fracture' | 'Decay' | 'Veneer' | 'Scaling' | 'Sealant'
  | 'Denture' | 'Orthodontics' | string;

export type ToothSeverity = 'mild' | 'moderate' | 'severe' | string;

// 13 conditions with fixed colours matching the web
export const CONDITION_COLOR: Record<string, string> = {
  Cavity:       '#ef4444',
  Filled:       '#3b82f6',
  Crown:        '#eab308',
  Missing:      '#9ca3af',
  RCT:          '#a855f7',
  Implant:      '#14b8a6',
  Fracture:     '#f97316',
  Decay:        '#dc2626',
  Veneer:       '#06b6d4',
  Scaling:      '#84cc16',
  Sealant:      '#8b5cf6',
  Denture:      '#f59e0b',
  Orthodontics: '#ec4899',
};

export const CONDITIONS: ToothCondition[] = Object.keys(CONDITION_COLOR);

export const SEVERITY_COLOR: Record<string, { bg: string; text: string }> = {
  mild:     { bg: '#DBEAFE', text: '#2563EB' },
  moderate: { bg: '#FED7AA', text: '#9A3412' },
  severe:   { bg: '#FEE2E2', text: '#DC2626' },
};

export interface Tooth {
  id: string;
  fdi_number: string;          // e.g. "11", "16"
  name: string;                // "Central Incisor"
  quadrant: 'UR' | 'UL' | 'LR' | 'LL' | string;
  position?: number;
  type?: 'incisor' | 'canine' | 'premolar' | 'molar' | string;
}

export interface ToothSurface {
  id: string;
  name: string;       // "Mesial"
  code: string;       // "M"
}

export interface PatientToothCondition {
  id: string;
  patient_id: string;
  branch_id?: string;
  tooth: Tooth;
  surface?: ToothSurface | null;
  condition: ToothCondition;
  severity?: ToothSeverity | null;
  notes?: string | null;
  diagnosed_by?: string;
  diagnosedBy?: { id: string; name: string };
  created_at: string;
  updated_at?: string;
}

export interface CreateConditionPayload {
  patient_id: string;
  branch_id: string;
  tooth_id: string;
  surface_id?: string;
  condition: ToothCondition;
  severity?: ToothSeverity;
  notes?: string;
  diagnosed_by?: string;
}

export const teethService = {
  // Reference data — both have stable lists in the DB
  listAllTeeth: async (): Promise<Tooth[]> => {
    try {
      const { data } = await api.get<Tooth[] | { data: Tooth[] }>('/teeth');
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  listSurfaces: async (): Promise<ToothSurface[]> => {
    try {
      const { data } = await api.get<ToothSurface[] | { data: ToothSurface[] }>('/tooth-surfaces');
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  // Patient-specific
  getPatientChart: async (patientId: string): Promise<PatientToothCondition[]> => {
    try {
      const { data } = await api.get<PatientToothCondition[] | { data: PatientToothCondition[] }>(
        `/patients/${patientId}/tooth-chart`,
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  addCondition: async (payload: CreateConditionPayload): Promise<PatientToothCondition> => {
    const { data } = await api.post<PatientToothCondition>('/patient-tooth-condition', payload);
    return data;
  },

  deleteCondition: async (id: string): Promise<void> => {
    await api.delete(`/patient-tooth-condition/${id}`);
  },
};
