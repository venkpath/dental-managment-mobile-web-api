import React from 'react';
import WebGuideScreen, { WEB_APP_URL } from '../../components/WebGuideScreen';

const CONFIG = {
  title: 'Billing',
  subtitle: 'Subscription & clinic billing',
  heroIcon: 'card' as const,
  heroTitle: 'Manage billing on web',
  heroText:
    'Clinic subscription, plan limits, WhatsApp quota, and payment settings are managed on the Smart Dental Desk web portal.',
  features: [
    { icon: 'ribbon-outline' as const, label: 'Subscription plan & usage' },
    { icon: 'logo-whatsapp' as const, label: 'WhatsApp message quota' },
    { icon: 'shield-checkmark-outline' as const, label: 'Feature access by plan' },
    { icon: 'receipt-outline' as const, label: 'Platform invoices & payments' },
  ],
  webUrl: WEB_APP_URL,
  tipText:
    'Patient invoices and expenses are available in this mobile app under Invoices and Expenses.',
};

export default function BillingGuideScreen() {
  return <WebGuideScreen config={CONFIG} />;
}
