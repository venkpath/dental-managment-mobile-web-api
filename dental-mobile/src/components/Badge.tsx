import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type Variant =
  | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  | 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  | 'PLANNED' | 'IN_PROGRESS'
  | 'PENDING' | 'PAID' | 'PARTIALLY_PAID'
  | 'pending' | 'paid' | 'partially_paid'
  | 'default';

const variantMap: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED:      { bg: colors.primaryLight,   text: colors.primaryDark, dot: colors.primary },
  COMPLETED:      { bg: colors.successLight,   text: '#15803d',          dot: colors.success },
  CANCELLED:      { bg: colors.dangerLight,    text: '#b91c1c',          dot: colors.danger },
  NO_SHOW:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  scheduled:      { bg: colors.primaryLight,   text: colors.primaryDark, dot: colors.primary },
  completed:      { bg: colors.successLight,   text: '#15803d',          dot: colors.success },
  cancelled:      { bg: colors.dangerLight,    text: '#b91c1c',          dot: colors.danger },
  no_show:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  PLANNED:        { bg: colors.purpleLight,    text: '#5b21b6',          dot: colors.purple },
  IN_PROGRESS:    { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  PENDING:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  PAID:           { bg: colors.successLight,   text: '#15803d',          dot: colors.success },
  PARTIALLY_PAID: { bg: colors.primaryLight,   text: colors.primaryDark, dot: colors.primary },
  pending:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  paid:           { bg: colors.successLight,   text: '#15803d',          dot: colors.success },
  partially_paid: { bg: colors.primaryLight,   text: colors.primaryDark, dot: colors.primary },
  default:        { bg: colors.borderLight,    text: colors.textSecondary, dot: colors.textMuted },
};

const labelMap: Record<string, string> = {
  SCHEDULED: 'Scheduled', scheduled: 'Scheduled',
  COMPLETED: 'Completed', completed: 'Completed',
  CANCELLED: 'Cancelled', cancelled: 'Cancelled',
  NO_SHOW: 'No Show',     no_show: 'No Show',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',       pending: 'Pending',
  PAID: 'Paid',             paid: 'Paid',
  PARTIALLY_PAID: 'Partial', partially_paid: 'Partially Paid',
};

interface Props {
  label: string;
  variant?: Variant;
  showDot?: boolean;
}

export default function Badge({ label, variant = 'default', showDot = true }: Props) {
  const style = variantMap[variant] ?? variantMap.default;
  const displayLabel = labelMap[label] ?? label.replace(/_/g, ' ');
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      {showDot && <View style={[styles.dot, { backgroundColor: style.dot }]} />}
      <Text style={[styles.text, { color: style.text }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: typography.xs,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
