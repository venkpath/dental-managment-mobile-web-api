import api from './api';
import type { PaginatedResponse } from '../types';

export interface MessageTemplate {
  id: string;
  template_name: string;
  channel: string;
  category?: string;
  body?: string;
  subject?: string;
  is_active?: boolean;
}

export const templatesService = {
  list: async (params?: { channel?: string; limit?: number; page?: number }) => {
    const { data } = await api.get<PaginatedResponse<MessageTemplate>>('/communication/templates', {
      params: { page: 1, limit: 50, ...params },
    });
    return data;
  },
};
