import api from './api';

export interface WaConversation {
  phone: string;
  patient_id: string | null;
  patient_name: string;
  last_message: string;
  last_at: string;
  last_direction: 'inbound' | 'outbound';
  unread_count: number;
}

export interface WaMessage {
  id: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
  template?: { template_name: string } | null;
}

export interface WaTemplate {
  id: string;
  template_name: string;
  body: string;
  language: string;
  whatsapp_template_status: string;
  is_active: boolean;
  variables?: string[];
}

export interface WaSettings {
  enable_whatsapp?: boolean;
  whatsapp_config?: Record<string, unknown>;
}

export const whatsappService = {
  getSettings: async (): Promise<WaSettings> => {
    const res = await api.get('/communication/settings');
    return res.data;
  },

  getConversations: async (page = 1, limit = 50) => {
    const res = await api.get('/communication/whatsapp/inbox', { params: { page, limit } });
    return res.data as {
      data: WaConversation[];
      meta: { total: number; page: number; limit: number; total_pages: number };
    };
  },

  getMessages: async (phone: string, page = 1, limit = 100) => {
    const res = await api.get(`/communication/whatsapp/inbox/${encodeURIComponent(phone)}`, {
      params: { page, limit },
    });
    return res.data as {
      data: WaMessage[];
      meta: { total: number; page: number; limit: number; total_pages: number };
    };
  },

  reply: async (phone: string, message: string) => {
    const res = await api.post(`/communication/whatsapp/inbox/${encodeURIComponent(phone)}/reply`, {
      message,
    });
    return res.data as { success: boolean; message_id: string };
  },

  getTemplates: async (limit = 100) => {
    const res = await api.get('/communication/templates', {
      params: { channel: 'whatsapp', limit },
    });
    return res.data as { data: WaTemplate[]; meta: Record<string, number> };
  },

  startConversation: async (data: {
    patient_id: string;
    template_id: string;
    variables?: Record<string, string>;
  }) => {
    const res = await api.post('/communication/whatsapp/inbox/new-conversation', data);
    return res.data;
  },
};
