import api from './api';
import type { ClinicUser } from '../types';

/** @deprecated Use ClinicUser from types */
export type StaffUser = Pick<ClinicUser, 'id' | 'name' | 'email' | 'role' | 'branch_id'>;

export interface Prescription {
  id: string;
  diagnosis: string;
  instructions?: string;
  created_at: string;
  dentist: { id: string; name: string };
  items: Array<{
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }>;
}

export interface DoctorAvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  branch_id?: string;
  password?: string;
  phone?: string;
  is_doctor?: boolean;
  listed_in_directory?: boolean;
  license_number?: string;
  bio?: string;
  years_experience?: number;
  specializations?: string[];
  languages_spoken?: string;
  consultation_fee?: number;
}

export const userService = {
  list: async (params?: {
    role?: string;
    search?: string;
    branch_id?: string;
  }): Promise<ClinicUser[]> => {
    const { data } = await api.get<ClinicUser[]>('/users', { params });
    return Array.isArray(data) ? data : [];
  },

  get: async (id: string): Promise<ClinicUser> => {
    const { data } = await api.get<ClinicUser>(`/users/${id}`);
    return data;
  },

  create: async (payload: CreateUserPayload): Promise<ClinicUser> => {
    const { data } = await api.post<ClinicUser>('/users', payload);
    return data;
  },

  update: async (
    id: string,
    payload: Partial<CreateUserPayload> & { status?: string; branch_id?: string | null },
  ): Promise<ClinicUser> => {
    const { data } = await api.patch<ClinicUser>(`/users/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  uploadSignature: async (id: string, file: { uri: string; name: string; type: string }): Promise<{ signature_url: string }> => {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    const { data } = await api.post<{ signature_url: string }>(`/users/${id}/signature`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadProfilePhoto: async (id: string, file: { uri: string; name: string; type: string }): Promise<{ profile_photo_url: string }> => {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    const { data } = await api.post<{ profile_photo_url: string }>(`/users/${id}/profile-photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deleteProfilePhoto: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}/profile-photo`);
  },

  getAvailability: async (id: string): Promise<DoctorAvailabilityRow[]> => {
    const { data } = await api.get<DoctorAvailabilityRow[]>(`/users/${id}/availability`);
    return Array.isArray(data) ? data : [];
  },

  upsertAvailability: async (id: string, schedule: DoctorAvailabilityRow[]): Promise<void> => {
    await api.put(`/users/${id}/availability`, { schedule });
  },

  getFeatureGrants: async (id: string): Promise<string[]> => {
    const { data } = await api.get<{ feature_keys: string[] }>(`/users/${id}/feature-grants`);
    return data.feature_keys ?? [];
  },

  setFeatureGrants: async (id: string, featureKeys: string[]): Promise<string[]> => {
    const { data } = await api.put<{ feature_keys: string[] }>(`/users/${id}/feature-grants`, { feature_keys: featureKeys });
    return data.feature_keys ?? [];
  },

  listStaff: async (): Promise<StaffUser[]> => {
    const [dentistsRes, adminsRes] = await Promise.all([
      api.get('/users', { params: { role: 'Dentist,Consultant' } }),
      api.get('/users', { params: { role: 'Admin' } }),
    ]);
    const dentists: StaffUser[] = Array.isArray(dentistsRes.data) ? dentistsRes.data : (dentistsRes.data as { data?: StaffUser[] })?.data ?? [];
    const admins: StaffUser[] = Array.isArray(adminsRes.data) ? adminsRes.data : (adminsRes.data as { data?: StaffUser[] })?.data ?? [];
    return [...dentists, ...admins];
  },

  getMe: async (): Promise<StaffUser> => {
    const { data } = await api.get<StaffUser>('/users/me');
    return data;
  },

  changePassword: async (old_password: string, new_password: string): Promise<void> => {
    await api.post('/auth/change-password', { old_password, new_password });
  },

  listPrescriptions: async (patientId: string): Promise<Prescription[]> => {
    const { data } = await api.get(`/patients/${patientId}/prescriptions`);
    return Array.isArray(data) ? data : (data as { data?: Prescription[] })?.data ?? [];
  },
};
