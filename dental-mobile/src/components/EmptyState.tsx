import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  title: string;
  subtitle?: string;
  icon?: IoniconsName | string;
}

export default function EmptyState({ title, subtitle, icon = 'file-tray-outline' }: Props) {
  // Support both Ionicons names and emoji strings
  const isEmoji = typeof icon === 'string' && icon.length <= 2 && /\p{Emoji}/u.test(icon);

  return (
    <View style={styles.container}>
      <View style={styles.iconBg}>
        {isEmoji ? (
          <Text style={styles.emoji}>{icon}</Text>
        ) : (
          <Ionicons name={icon as IoniconsName} size={32} color={colors.primary} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
