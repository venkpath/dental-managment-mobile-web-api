import api from './api';
import type { Patient, PaginatedResponse } from '../types';

export const patientService = {
  list: async (page = 1, search = '', limit = 10): Promise<PaginatedResponse<Patient>> => {
    const { data } = await api.get('/patients', {
      params: { page, limit, search: search || undefined },
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

  uploadProfilePhoto: async (
    id: string,
    file: { uri: string; name: string; type: string },
  ): Promise<{ profile_photo_url: string }> => {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    const { data } = await api.post<{ profile_photo_url: string }>(`/patients/${id}/profile-photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deleteProfilePhoto: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}/profile-photo`);
  },
};
