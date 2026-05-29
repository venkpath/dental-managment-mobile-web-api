import api from './api';
import type { Prescription as PrescriptionRecord, PaginatedResponse } from '../types';

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
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  purpose?: string;
  notes?: string;
  warnings?: string;
  morning?: number;
  afternoon?: number;
  evening?: number;
  night?: number;
  inventory_id?: string;
}

export interface CreatePrescriptionPayload {
  patient_id: string;
  dentist_id: string;
  branch_id: string;
  clinical_visit_id?: string;
  diagnosis?: string;
  instructions?: string;
  chief_complaint?: string;
  past_dental_history?: string;
  allergies_medical_history?: string;
  interactions?: string;
  dietary_advice?: string;
  post_procedure_instructions?: string;
  follow_up?: string;
  items?: CreatePrescriptionItem[];
}

export const prescriptionService = {
  /** Global, paginated list across the whole clinic (dentist / admin view). */
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    dentist_id?: string;
    branch_id?: string;
  }): Promise<PaginatedResponse<PrescriptionRecord>> => {
    const { data } = await api.get('/prescriptions', {
      params: { page: 1, limit: 20, ...params },
    });
    return data;
  },

  /** Full prescription record (patient + dentist + branch + medicine items). */
  getDetail: async (id: string): Promise<PrescriptionRecord | null> => {
    try {
      const { data } = await api.get<PrescriptionRecord>(`/prescriptions/${id}`);
      return data;
    } catch {
      return null;
    }
  },

  getPdfUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/prescriptions/${id}/pdf`);
    return data.url;
  },

  sendWhatsApp: async (id: string): Promise<void> => {
    await api.post(`/prescriptions/${id}/send-whatsapp`);
  },

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

  update: async (
    id: string,
    payload: Partial<{
      diagnosis: string;
      instructions: string;
      dentist_id: string;
      items: CreatePrescriptionItem[];
    }>,
  ): Promise<Prescription> => {
    const { data } = await api.patch<Prescription>(`/prescriptions/${id}`, payload);
    return data;
  },
};
