import api from './api';

export type ClinicProfile = {
  id: string;
  name: string;
  logo_url?: string | null;
  subscription_status?: string;
  trial_ends_at?: string | null;
  plan?: { name: string; price_monthly?: number } | null;
};

export const clinicService = {
  getMe: async (): Promise<ClinicProfile> => {
    const { data } = await api.get<ClinicProfile>('/clinics/me');
    return data;
  },
};
