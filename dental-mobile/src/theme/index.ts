import { Platform } from 'react-native';

export const colors = {
  // Primary — deeper, richer teal
  primary: '#0891b2',
  primaryDark: '#0e7490',
  primaryLight: '#ecfeff',
  primaryMid: '#cffafe',
  primarySoft: '#f0fdfa',

  // Secondary
  secondary: '#64748b',
  secondaryLight: '#f1f5f9',

  // Accents
  accent: '#6366f1',     // indigo accent for highlights
  accentLight: '#eef2ff',

  // Status
  success: '#059669',
  successLight: '#d1fae5',
  warning: '#d97706',
  warningLight: '#fef3c7',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',

  // Surfaces
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  divider: '#f1f5f9',

  // Text
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textLight: '#cbd5e1',

  white: '#ffffff',
  black: '#000000',

  // Stat card themes — gradient-inspired pairs
  stat1: { bg: '#0891b2', gradient: '#06b6d4', light: '#ecfeff', icon: '#cffafe' },
  stat2: { bg: '#059669', gradient: '#10b981', light: '#d1fae5', icon: '#a7f3d0' },
  stat3: { bg: '#d97706', gradient: '#f59e0b', light: '#fef3c7', icon: '#fde68a' },
  stat4: { bg: '#dc2626', gradient: '#ef4444', light: '#fee2e2', icon: '#fecaca' },

  // Status mapping
  scheduled: '#0891b2',
  completed: '#059669',
  cancelled: '#dc2626',
  no_show: '#d97706',
  planned: '#7c3aed',
  in_progress: '#d97706',
};

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }),
};

// Shared layout helpers
export const layout = {
  screenPadding: 20,
  cardPadding: 16,
  sectionGap: 24,
};
