import api from './api';

export interface DemoSlot {
  slot: string;
  label: string;
  available: boolean;
  reason?: 'lunch' | 'booked';
}

export interface DemoSlotsResponse {
  date: string;
  timezone: string;
  window: string;
  lunch_block: string;
  slots: DemoSlot[];
}

export const demoService = {
  getAvailableSlots: async (date: string): Promise<DemoSlotsResponse> => {
    const { data } = await api.get<DemoSlotsResponse>('/demo-requests/available-slots', {
      params: { date },
    });
    return data;
  },

  submitFromApp: async (preferredDate: string, preferredSlot: string): Promise<{ success: boolean; id: string }> => {
    const { data } = await api.post<{ success: boolean; id: string }>('/demo-requests/from-app', {
      preferredDate,
      preferredSlot,
    });
    return data;
  },
};
