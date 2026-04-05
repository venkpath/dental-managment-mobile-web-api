import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  variant?: 'default' | 'flat' | 'elevated';
}

export default function Card({ children, style, padding = spacing.base, variant = 'default' }: Props) {
  return (
    <View style={[styles.card, styles[variant], { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  default: {
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  flat: {
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  elevated: {
    ...shadow.lg,
  },
});
