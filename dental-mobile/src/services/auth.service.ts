import api from './api';

export interface ClinicOption {
  clinic_id: string;
  clinic_name: string;
  clinic_email: string;
  subscription_status: string;
  role: string;
}

export interface LookupResponse {
  clinics: ClinicOption[];
  requires_clinic_selection: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    branch_id?: string | null;
    clinic_id: string;
    status?: string;
  };
}

export const authService = {
  lookup: async (email: string, password: string): Promise<LookupResponse> => {
    const { data } = await api.post<LookupResponse>('/auth/lookup', { email, password });
    return data;
  },

  login: async (email: string, password: string, clinicId: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
      clinic_id: clinicId,
    });
    return data;
  },
};
