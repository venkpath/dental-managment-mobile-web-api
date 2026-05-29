import api from './api';
import type { Branch, BranchScheduling } from '../types';

export const branchService = {
  list: async (): Promise<Branch[]> => {
    const { data } = await api.get<Branch[]>('/branches');
    return Array.isArray(data) ? data : [];
  },

  get: async (id: string): Promise<Branch> => {
    const { data } = await api.get<Branch>(`/branches/${id}`);
    return data;
  },

  getScheduling: async (id: string): Promise<BranchScheduling> => {
    const { data } = await api.get<BranchScheduling>(`/branches/${id}/scheduling`);
    return data;
  },

  create: async (payload: Partial<Branch>): Promise<Branch> => {
    const { data } = await api.post<Branch>('/branches', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Branch>): Promise<Branch> => {
    const { data } = await api.patch<Branch>(`/branches/${id}`, payload);
    return data;
  },

  updateScheduling: async (id: string, payload: Partial<BranchScheduling>): Promise<BranchScheduling> => {
    const { data } = await api.patch<BranchScheduling>(`/branches/${id}/scheduling`, payload);
    return data;
  },

  uploadPhoto: async (id: string, file: { uri: string; name: string; type: string }): Promise<Branch> => {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    const { data } = await api.post<Branch>(`/branches/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deletePhoto: async (id: string): Promise<void> => {
    await api.delete(`/branches/${id}/photo`);
  },
};
