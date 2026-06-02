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
  refresh_token: string;
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

export interface RegisterClinicPayload {
  clinic_name: string;
  clinic_email: string;
  clinic_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  admin_password: string;
  phone_verification_token: string;
  is_doctor?: boolean;
  license_number?: string;
  plan_key?: string;
  billing_cycle?: 'monthly' | 'yearly';
}

export interface RegisterClinicResponse {
  clinic: { id: string; name: string; email: string };
  admin: { id: string; name: string; email: string };
  message?: string;
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

  lookupByPhone: async (phone: string, password: string): Promise<LookupResponse> => {
    const { data } = await api.post<LookupResponse>('/auth/lookup-by-phone', { phone, password });
    return data;
  },

  loginByPhone: async (phone: string, password: string, clinicId: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login-by-phone', {
      phone,
      password,
      clinic_id: clinicId,
    });
    return data;
  },

  sendRegistrationOtp: async (phone: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>('/auth/register/send-otp', { phone });
    return data;
  },

  verifyRegistrationOtp: async (
    phone: string,
    code: string,
  ): Promise<{ verified: boolean; token?: string; message: string }> => {
    const { data } = await api.post<{ verified: boolean; token?: string; message: string }>(
      '/auth/register/verify-otp',
      { phone, code },
    );
    return data;
  },

  registerClinic: async (payload: RegisterClinicPayload): Promise<RegisterClinicResponse> => {
    const { data } = await api.post<RegisterClinicResponse>('/auth/register', payload);
    return data;
  },
};
