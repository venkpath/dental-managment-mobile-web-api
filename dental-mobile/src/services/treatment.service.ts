import api from './api';
import type { Treatment, PaginatedResponse } from '../types';

export const treatmentService = {
  listByPatient: async (patientId: string): Promise<Treatment[]> => {
    const { data } = await api.get<Treatment[]>(`/patients/${patientId}/treatments`);
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  },

  get: async (id: string): Promise<Treatment> => {
    const { data } = await api.get<Treatment>(`/treatments/${id}`);
    return data;
  },

  create: async (payload: {
    patient_id: string;
    branch_id: string;
    dentist_id: string;
    tooth_number?: string;
    diagnosis: string;
    procedure: string;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
    cost: number;
    notes?: string;
  }): Promise<Treatment> => {
    const { data } = await api.post<Treatment>('/treatments', payload);
    return data;
  },

  update: async (id: string, payload: {
    tooth_number?: string;
    diagnosis?: string;
    procedure?: string;
    status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
    cost?: number;
    notes?: string;
  }): Promise<Treatment> => {
    const { data } = await api.patch<Treatment>(`/treatments/${id}`, payload);
    return data;
  },
};
