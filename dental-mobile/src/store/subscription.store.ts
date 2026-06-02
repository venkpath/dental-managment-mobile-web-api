import { create } from 'zustand';
import { paymentService, type SubscriptionStatus } from '../services/payment.service';
import { clinicService } from '../services/clinic.service';
import { useAuthStore } from './auth.store';
import { canManageClinicBilling } from '../utils/clinicRoles';

export type SubscriptionBannerState = {
  subscription_status: string;
  is_trial_active: boolean;
  trial_days_left: number;
  plan_name: string | null;
};

type SubscriptionStore = {
  banner: SubscriptionBannerState | null;
  fullStatus: SubscriptionStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
  shouldShowBanner: () => boolean;
};

function bannerFromStatus(status: SubscriptionStatus): SubscriptionBannerState {
  return {
    subscription_status: status.subscription_status,
    is_trial_active: status.is_trial_active,
    trial_days_left: status.trial_days_left,
    plan_name: status.plan?.name ?? null,
  };
}

function bannerFromClinic(clinic: {
  subscription_status?: string;
  trial_ends_at?: string | null;
  plan?: { name: string } | null;
}): SubscriptionBannerState {
  const now = Date.now();
  const end = clinic.trial_ends_at ? new Date(clinic.trial_ends_at).getTime() : 0;
  const status = clinic.subscription_status ?? 'trial';
  const isTrialActive = status === 'trial' && end > now;
  const trialDaysLeft = end > now ? Math.max(0, Math.ceil((end - now) / 86400000)) : 0;
  return {
    subscription_status: status,
    is_trial_active: isTrialActive,
    trial_days_left: trialDaysLeft,
    plan_name: clinic.plan?.name ?? null,
  };
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  banner: null,
  fullStatus: null,
  loading: false,

  shouldShowBanner: () => {
    const b = get().banner;
    if (!b) return false;
    if (b.subscription_status === 'active') return false;
    if (b.subscription_status === 'trial' && b.is_trial_active) return true;
    return true;
  },

  refresh: async () => {
    const { token, user, clinicId } = useAuthStore.getState();
    if (!token || !clinicId) return;
    set({ loading: true });
    try {
      if (canManageClinicBilling(user?.role)) {
        const status = await paymentService.getStatus();
        set({ fullStatus: status, banner: bannerFromStatus(status) });
      } else {
        const clinic = await clinicService.getMe();
        set({ fullStatus: null, banner: bannerFromClinic(clinic) });
      }
    } catch {
      // Non-fatal — banner stays hidden
    } finally {
      set({ loading: false });
    }
  },
}));

export async function refreshSubscription(): Promise<void> {
  await useSubscriptionStore.getState().refresh();
}
