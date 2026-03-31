import api from './api';
import type { Patient, PaginatedResponse } from '../types';

export const patientService = {
  list: async (page = 1, search = ''): Promise<PaginatedResponse<Patient>> => {
    const { data } = await api.get('/patients', {
      params: { page, limit: 20, search: search || undefined },
    });
    return data;
  },

  get: async (id: string): Promise<Patient> => {
    const { data } = await api.get<Patient>(`/patients/${id}`);
    return data;
  },

  create: async (payload: Partial<Patient> & { branch_id: string }): Promise<Patient> => {
    const { data } = await api.post<Patient>('/patients', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Patient>): Promise<Patient> => {
    const { data } = await api.patch<Patient>(`/patients/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },
};
