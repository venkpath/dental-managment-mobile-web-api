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
  COMPLETED:      { bg: colors.successLight,   text: '#065f46',          dot: colors.success },
  CANCELLED:      { bg: colors.dangerLight,    text: '#991b1b',          dot: colors.danger },
  NO_SHOW:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  scheduled:      { bg: colors.primaryLight,   text: colors.primaryDark, dot: colors.primary },
  completed:      { bg: colors.successLight,   text: '#065f46',          dot: colors.success },
  cancelled:      { bg: colors.dangerLight,    text: '#991b1b',          dot: colors.danger },
  no_show:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  PLANNED:        { bg: colors.purpleLight,    text: '#5b21b6',          dot: colors.purple },
  IN_PROGRESS:    { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  PENDING:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  PAID:           { bg: colors.successLight,   text: '#065f46',          dot: colors.success },
  PARTIALLY_PAID: { bg: colors.primaryLight,   text: colors.primaryDark, dot: colors.primary },
  pending:        { bg: colors.warningLight,   text: '#92400e',          dot: colors.warning },
  paid:           { bg: colors.successLight,   text: '#065f46',          dot: colors.success },
  partially_paid: { bg: colors.primaryLight,   text: colors.primaryDark, dot: colors.primary },
  default:        { bg: colors.secondaryLight,  text: colors.textSecondary, dot: colors.textMuted },
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
  size?: 'sm' | 'md';
}

export default function Badge({ label, variant = 'default', showDot = true, size = 'md' }: Props) {
  const style = variantMap[variant] ?? variantMap.default;
  const displayLabel = labelMap[label] ?? label.replace(/_/g, ' ');
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }, isSmall && styles.badgeSm]}>
      {showDot && <View style={[styles.dot, { backgroundColor: style.dot }]} />}
      <Text style={[styles.text, { color: style.text }, isSmall && styles.textSm]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
    gap: 5,
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: typography.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
  },
});
