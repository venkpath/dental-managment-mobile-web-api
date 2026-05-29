import api from './api';

export interface PrescriptionItem {
  id?: string;
  drug_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  branch_id?: string;
  diagnosis?: string;
  notes?: string;
  status?: string;
  items?: PrescriptionItem[];
  dentist?: { id: string; name: string };
  created_at: string;
  updated_at?: string;
}

export interface CreatePrescriptionItem {
  drug_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  purpose?: string;
  notes?: string;
  warnings?: string;
  /** Backend stores dosage_schedule as JSON { morning, afternoon, evening, night } */
  dosage_schedule?: { morning?: number; afternoon?: number; evening?: number; night?: number };
}

export interface CreatePrescriptionPayload {
  patient_id: string;
  dentist_id: string;
  branch_id: string;
  diagnosis?: string;
  notes?: string;
  interactions?: string;
  dietary_advice?: string;
  post_procedure_instructions?: string;
  follow_up?: string;
  items: CreatePrescriptionItem[];
}

export const prescriptionService = {
  listByPatient: async (patientId: string): Promise<Prescription[]> => {
    try {
      const { data } = await api.get<Prescription[] | { data: Prescription[] }>(
        `/patients/${patientId}/prescriptions`,
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  get: async (id: string): Promise<Prescription | null> => {
    try {
      const { data } = await api.get<Prescription>(`/prescriptions/${id}`);
      return data;
    } catch {
      return null;
    }
  },

  create: async (payload: CreatePrescriptionPayload): Promise<Prescription> => {
    const { data } = await api.post<Prescription>('/prescriptions', payload);
    return data;
  },
};
