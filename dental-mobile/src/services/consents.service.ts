import api from './api';

export type ConsentStatus = 'pending' | 'signed' | 'cancelled' | 'archived' | string;

export interface PatientConsent {
  id: string;
  patient_id: string;
  template?: { id: string; title: string };
  template_title?: string; // sometimes flattened
  status: ConsentStatus;
  language?: string;
  procedure?: string;
  generated_at?: string;
  signed_at?: string | null;
  signed_by_name?: string | null;
  signed_method?: 'digital' | 'upload' | 'remote_link' | string;
  link_sent_at?: string | null;
  archived_at?: string | null;
  created_at: string;
}

export interface ConsentTemplate {
  id: string;
  title: string;
  language?: string;
  is_active?: boolean;
}

export const consentsService = {
  listForPatient: async (patientId: string): Promise<PatientConsent[]> => {
    try {
      const { data } = await api.get<PatientConsent[] | { data: PatientConsent[] }>(
        `/consents/patient/${patientId}`,
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  listTemplates: async (language?: string): Promise<ConsentTemplate[]> => {
    try {
      const { data } = await api.get<ConsentTemplate[] | { data: ConsentTemplate[] }>('/consents/templates', {
        params: { language, is_active: true },
      });
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  listLanguages: async (): Promise<string[]> => {
    try {
      const { data } = await api.get<string[] | { data: string[] }>('/consents/languages');
      return Array.isArray(data) ? data : (data?.data ?? ['en']);
    } catch {
      return ['en'];
    }
  },

  create: async (patientId: string, payload: { template_id: string; procedure?: string }): Promise<PatientConsent> => {
    const { data } = await api.post<PatientConsent>(`/consents/for-patient/${patientId}`, payload);
    return data;
  },

  signDigital: async (consentId: string, payload: { signature_data_url: string; signed_by_name: string }): Promise<PatientConsent> => {
    const { data } = await api.post<PatientConsent>(`/consents/${consentId}/sign-digital`, payload);
    return data;
  },

  sendSignLink: async (consentId: string): Promise<{ channel?: string; link?: string }> => {
    const { data } = await api.post(`/consents/${consentId}/send-sign-link`, {});
    return data ?? {};
  },

  archive: async (consentId: string): Promise<void> => {
    await api.post(`/consents/${consentId}/archive`, {});
  },

  getDownloadUrl: async (consentId: string): Promise<string | null> => {
    try {
      const { data } = await api.get<{ url: string }>(`/consents/${consentId}/download-url`);
      return data?.url ?? null;
    } catch {
      return null;
    }
  },
};
