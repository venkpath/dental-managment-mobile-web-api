import api from './api';
import type { Appointment, PaginatedResponse } from '../types';

export const appointmentService = {
  list: async (params?: {
    page?: number;
    date?: string;
    dentist_id?: string;
    status?: string;
  }): Promise<PaginatedResponse<Appointment>> => {
    const { data } = await api.get('/appointments', {
      params: { page: 1, limit: 30, ...params },
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
};
