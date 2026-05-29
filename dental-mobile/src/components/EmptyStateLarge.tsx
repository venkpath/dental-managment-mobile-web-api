import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateLargeProps {
  /** Big emoji at the top — picks better visual hierarchy than icons */
  emoji?: string;
  /** Fallback icon if no emoji */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Smaller padding variant for inside cards */
  compact?: boolean;
}

export function EmptyStateLarge({
  emoji, icon = 'document-outline', iconColor = '#4361EE', iconBg = '#EEF2FF',
  title, subtitle, actionLabel, onAction, compact,
}: EmptyStateLargeProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {emoji ? (
        <View style={[styles.emojiBox, { backgroundColor: iconBg }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
      ) : (
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={compact ? 24 : 32} color={iconColor} />
        </View>
      )}
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.btn} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.btnTxt}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, paddingHorizontal: 24, gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  wrapCompact: { paddingVertical: 20, paddingHorizontal: 16, gap: 6 },
  emojiBox: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emoji: { fontSize: 34 },
  iconBox: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  titleCompact: { fontSize: 14 },
  subtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  subtitleCompact: { fontSize: 11, lineHeight: 16 },
  btn: {
    backgroundColor: '#4361EE', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    marginTop: 6,
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
