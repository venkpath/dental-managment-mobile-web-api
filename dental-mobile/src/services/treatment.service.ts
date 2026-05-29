import api from './api';
import type { Treatment, PaginatedResponse } from '../types';

export const treatmentService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: Treatment['status'];
    patient_id?: string;
    dentist_id?: string;
    branch_id?: string;
  }): Promise<PaginatedResponse<Treatment>> => {
    const { data } = await api.get<PaginatedResponse<Treatment>>('/treatments', {
      params: { page: 1, limit: 20, ...params },
    });
    if (data?.data && data?.meta) return data;
    return { data: Array.isArray(data) ? data : [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } };
  },

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
    status: Treatment['status'];
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
    status?: Treatment['status'];
    cost?: number;
    notes?: string;
  }): Promise<Treatment> => {
    const { data } = await api.patch<Treatment>(`/treatments/${id}`, payload);
    return data;
  },
};
