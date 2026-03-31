import api from './api';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id?: string;
}

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

export const userService = {
  // Fetch dentists + admins (used to pick dentists for booking)
  listStaff: async (): Promise<StaffUser[]> => {
    const [dentistsRes, adminsRes] = await Promise.all([
      api.get('/users', { params: { role: 'Dentist' } }),
      api.get('/users', { params: { role: 'Admin' } }),
    ]);
    const dentists: StaffUser[] = Array.isArray(dentistsRes.data) ? dentistsRes.data : (dentistsRes.data as any)?.data ?? [];
    const admins: StaffUser[] = Array.isArray(adminsRes.data) ? adminsRes.data : (adminsRes.data as any)?.data ?? [];
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
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  },
};
