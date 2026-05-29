import React from 'react';
import WebGuideScreen, { WEB_APP_URL } from '../../components/WebGuideScreen';

const CONFIG = {
  title: 'Settings',
  subtitle: 'Clinic & account configuration',
  heroIcon: 'settings' as const,
  heroTitle: 'Full settings on web',
  heroText:
    'Clinic profile, roles, integrations, and advanced preferences are easiest to configure on desktop. Use the same login as this app.',
  features: [
    { icon: 'business-outline' as const, label: 'Clinic profile & branding' },
    { icon: 'people-outline' as const, label: 'Roles & permissions' },
    { icon: 'git-network-outline' as const, label: 'Integrations & API keys' },
    { icon: 'notifications-outline' as const, label: 'Notification preferences' },
    { icon: 'color-palette-outline' as const, label: 'Regional & display options' },
  ],
  webUrl: WEB_APP_URL,
  tipText:
    'Staff, branches, and scheduling can be managed from this app under Administration.',
};

export default function SettingsGuideScreen() {
  return <WebGuideScreen config={CONFIG} />;
}
