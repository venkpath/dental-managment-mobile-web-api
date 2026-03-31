import api from './api';
import type { Appointment, AvailableSlot, PaginatedResponse } from '../types';

export const appointmentService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    date?: string;
    dentist_id?: string;
    status?: string;
  }): Promise<PaginatedResponse<Appointment>> => {
    const { data } = await api.get('/appointments', {
      params: { page: 1, limit: 20, ...params },
    });
    return data;
  },

  get: async (id: string): Promise<Appointment> => {
    const { data } = await api.get<Appointment>(`/appointments/${id}`);
    return data;
  },

  updateStatus: async (
    id: string,
    status: Appointment['status']
  ): Promise<Appointment> => {
    const { data } = await api.patch<Appointment>(`/appointments/${id}`, { status });
    return data;
  },

  reschedule: async (
    id: string,
    payload: { appointment_date: string; start_time: string; end_time: string }
  ): Promise<Appointment> => {
    const { data } = await api.patch<Appointment>(`/appointments/${id}`, payload);
    return data;
  },

  create: async (payload: {
    patient_id: string;
    dentist_id: string;
    branch_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    notes?: string;
  }): Promise<Appointment> => {
    const { data } = await api.post<Appointment>('/appointments', payload);
    return data;
  },

  getAvailableSlots: async (params: {
    branch_id: string;
    dentist_id: string;
    date: string;
  }): Promise<AvailableSlot[]> => {
    const { data } = await api.get<AvailableSlot[]>('/appointments/available-slots', { params });
    return Array.isArray(data) ? data : [];
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },
};
