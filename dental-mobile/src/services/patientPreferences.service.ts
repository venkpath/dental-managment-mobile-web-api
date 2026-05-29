import api from './api';

export interface PatientPreferences {
  allow_email?: boolean;
  allow_sms?: boolean;
  allow_whatsapp?: boolean;
  allow_marketing?: boolean;
  allow_reminders?: boolean;
  preferred_channel?: 'whatsapp' | 'sms' | 'email' | string;
  quiet_hours_start?: string; // HH:MM
  quiet_hours_end?: string;   // HH:MM
}

const DEFAULTS: PatientPreferences = {
  allow_email: true,
  allow_sms: true,
  allow_whatsapp: true,
  allow_marketing: false,
  allow_reminders: true,
  preferred_channel: 'whatsapp',
  quiet_hours_start: '21:00',
  quiet_hours_end: '09:00',
};

export const patientPreferencesService = {
  get: async (patientId: string): Promise<PatientPreferences> => {
    try {
      const { data } = await api.get<PatientPreferences>(`/patient-preferences/${patientId}`);
      return { ...DEFAULTS, ...(data ?? {}) };
    } catch {
      return DEFAULTS;
    }
  },

  update: async (patientId: string, payload: PatientPreferences): Promise<PatientPreferences> => {
    const { data } = await api.patch<PatientPreferences>(`/patient-preferences/${patientId}`, payload);
    return data;
  },
};
