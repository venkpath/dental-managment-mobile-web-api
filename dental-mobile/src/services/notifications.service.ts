import api from './api';
import type { PaginatedResponse } from '../types';

export interface AppNotification {
  id: string;
  clinic_id: string;
  user_id?: string | null;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  metadata?: {
    appointment_id?: string;
    patient_id?: string;
    minutes_before?: number;
    [key: string]: unknown;
  } | null;
  created_at: string;
}

interface NotificationQuery {
  page?: number;
  limit?: number;
  type?: string;
  is_read?: boolean;
}

export const notificationsService = {
  list: async (params: NotificationQuery = {}) => {
    const { data } = await api.get<PaginatedResponse<AppNotification>>('/notifications', { params });
    return data;
  },

  unreadCount: async () => {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  markRead: async (id: string) => {
    const { data } = await api.patch<AppNotification>(`/notifications/${id}/read`);
    return data;
  },

  markAllRead: async () => {
    const { data } = await api.patch<{ count: number }>('/notifications/read-all');
    return data.count;
  },

  registerPushToken: async (token: string, platform?: 'ios' | 'android', deviceId?: string) => {
    await api.post('/notifications/push-token', {
      token,
      platform,
      device_id: deviceId,
    });
  },

  unregisterPushToken: async (token: string) => {
    await api.delete('/notifications/push-token', { data: { token } });
  },
};
