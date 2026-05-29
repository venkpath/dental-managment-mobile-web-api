import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type RegistrationPlan = {
  key: string;
  name: string;
  price: number;
  priceYearly: number;
  period: string;
  summary: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  iconColor: string;
  popular?: boolean;
};

/** Matches web register page plans and backend plan_key lookup. */
export const REGISTRATION_PLANS: RegistrationPlan[] = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    priceYearly: 0,
    period: 'forever',
    summary: '1 dentist · 10 patients & appointments/mo · Billing & prescriptions',
    icon: 'gift-outline',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
  },
  {
    key: 'standard',
    name: 'Standard',
    price: 699,
    priceYearly: 6999,
    period: '/mo',
    summary: 'Unlimited dentists & branches · AI copilot · WhatsApp reminders',
    icon: 'rocket-outline',
    iconBg: '#D1FAE5',
    iconColor: '#059669',
    popular: true,
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 1299,
    priceYearly: 12999,
    period: '/mo',
    summary: 'WhatsApp campaigns · Advanced AI · Automation · Priority support',
    icon: 'ribbon-outline',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
  },
];

export function getRegistrationPlan(key: string): RegistrationPlan {
  return REGISTRATION_PLANS.find((p) => p.key === key) ?? REGISTRATION_PLANS[1];
}
