import api from './api';

export interface SubscriptionStatus {
  subscription_status: string;
  plan: { id: string; name: string; price_monthly: number; price_yearly: number | null } | null;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_at: string | null;
  effective_price: number | null;
  price_source: 'custom' | 'plan' | 'none' | null;
  custom_price_expires_at: string | null;
  trial_ends_at: string | null;
  is_trial_active: boolean;
  trial_days_left: number;
  subscription_id: string | null;
  razorpay_key_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  next_charge_at: string | null;
  paid_count: number;
  total_count: number;
  remaining_count: number;
  started_at: string | null;
  ended_at: string | null;
}

export interface PlanWithFeatures {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  max_branches: number;
  max_staff: number;
  ai_quota: number;
  plan_features?: { feature: { key: string; description: string }; is_enabled: boolean }[];
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  shortUrl: string;
}

export const paymentService = {
  getStatus: async (): Promise<SubscriptionStatus> => {
    const { data } = await api.get<SubscriptionStatus>('/payment/status');
    return data;
  },

  getPlans: async (): Promise<PlanWithFeatures[]> => {
    const { data } = await api.get<PlanWithFeatures[]>('/payment/plans');
    return data;
  },

  subscribe: async (
    planKey: string,
    options?: {
      planId?: string;
      changeEffective?: 'now' | 'cycle_end';
      billingCycle?: 'monthly' | 'yearly';
    },
  ): Promise<CreateSubscriptionResponse> => {
    const { data } = await api.post<CreateSubscriptionResponse>('/payment/subscribe', {
      planKey,
      ...(options?.planId ? { planId: options.planId } : {}),
      ...(options?.changeEffective ? { change_effective: options.changeEffective } : {}),
      ...(options?.billingCycle ? { billing_cycle: options.billingCycle } : {}),
    });
    return data;
  },

  cancel: async (): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>('/payment/cancel');
    return data;
  },
};
