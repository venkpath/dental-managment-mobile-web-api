import React from 'react';
import WebGuideScreen, { WEB_APP_URL } from '../../components/WebGuideScreen';

const CONFIG = {
  title: 'Communications',
  subtitle: 'Templates, automation & channels',
  heroIcon: 'chatbubbles' as const,
  heroTitle: 'Best configured on web',
  heroText:
    'WhatsApp templates, automation rules, message history, analytics, and channel settings are fully available on Smart Dental Desk web. Sign in with your clinic account to manage them.',
  features: [
    { icon: 'document-text-outline' as const, label: 'Message templates (WhatsApp, SMS, email)' },
    { icon: 'flash-outline' as const, label: 'Appointment & payment automation' },
    { icon: 'chatbox-outline' as const, label: 'Message inbox & compose' },
    { icon: 'stats-chart-outline' as const, label: 'Communication analytics' },
    { icon: 'logo-whatsapp' as const, label: 'WhatsApp Business connection' },
    { icon: 'timer-outline' as const, label: 'Reminder queue & cron jobs' },
  ],
  webUrl: WEB_APP_URL,
  tipText:
    'Use Campaigns in this app to send bulk messages. Open web for template editing, automation setup, and advanced configuration.',
};

export default function CommunicationsGuideScreen() {
  return <WebGuideScreen config={CONFIG} />;
}
