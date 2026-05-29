import api from './api';
import type { PaginatedResponse } from '../types';

export type CampaignChannel = 'whatsapp' | 'sms' | 'email' | 'all';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
export type CampaignSegmentType =
  | 'all'
  | 'inactive'
  | 'treatment_type'
  | 'birthday_month'
  | 'location'
  | 'custom'
  | 'no_show_risk'
  | 'churn_risk'
  | 'recall_due';

export interface CampaignTemplate {
  id: string;
  template_name: string;
  channel?: string;
  body?: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  segment_type: CampaignSegmentType;
  segment_config?: Record<string, unknown> | null;
  status: CampaignStatus;
  template_id?: string | null;
  template?: CampaignTemplate | null;
  scheduled_at?: string | null;
  total_recipients?: number;
  sent_count?: number;
  delivered_count?: number;
  failed_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface AudiencePreview {
  total_count: number;
  sample: Array<{ id: string; name: string; phone: string; email?: string | null }>;
}

export interface CampaignAnalytics {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  delivery_rate: number;
  roi?: { cost: number; attributed_revenue: number; roi_percentage: number };
}

export interface CreateCampaignPayload {
  name: string;
  channel: CampaignChannel;
  segment_type: CampaignSegmentType;
  segment_config?: Record<string, unknown>;
  template_id?: string;
  scheduled_at?: string;
}

export const campaignsService = {
  list: async (params?: { page?: number; limit?: number; status?: string; channel?: string }) => {
    const { data } = await api.get<PaginatedResponse<Campaign>>('/campaigns', { params });
    return data;
  },

  get: async (id: string): Promise<Campaign> => {
    const { data } = await api.get<Campaign>(`/campaigns/${id}`);
    return data;
  },

  create: async (payload: CreateCampaignPayload): Promise<Campaign> => {
    const { data } = await api.post<Campaign>('/campaigns', payload);
    return data;
  },

  update: async (id: string, payload: Partial<CreateCampaignPayload>): Promise<Campaign> => {
    const { data } = await api.patch<Campaign>(`/campaigns/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/campaigns/${id}`);
  },

  execute: async (id: string) => {
    const { data } = await api.post(`/campaigns/${id}/execute`);
    return data;
  },

  previewAudience: async (segment_type: string, segment_config?: Record<string, unknown>): Promise<AudiencePreview> => {
    const { data } = await api.post<AudiencePreview>('/campaigns/audience-preview', {
      segment_type,
      segment_config,
    });
    return data;
  },

  getAnalytics: async (id: string): Promise<CampaignAnalytics> => {
    const { data } = await api.get<CampaignAnalytics>(`/campaigns/${id}/analytics`);
    return data;
  },

  listTreatmentProcedures: async (): Promise<Array<{ procedure: string; patient_count: number }>> => {
    const { data } = await api.get<Array<{ procedure: string; patient_count: number }>>(
      '/campaigns/treatment-procedures',
    );
    return data;
  },
};
