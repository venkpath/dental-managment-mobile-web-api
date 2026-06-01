import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '../theme';
import { APP_C } from '../theme/appChrome';

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.label}>{title}</Text>
      {children}
    </View>
  );
}

export function PillRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.pillRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[s.pill, active && s.pillActive]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.7}
          >
            <Text style={[s.pillTxt, active && s.pillTxtActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function SelectField({
  label,
  value,
  placeholder,
  error,
  onPress,
}: {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onPress: () => void;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity style={[s.select, error && s.selectError]} onPress={onPress} activeOpacity={0.7}>
        <Text style={value ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
          {value || placeholder || 'Select…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={APP_C.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  label: { fontSize: 11, fontWeight: '700', color: APP_C.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: APP_C.bg,
    borderWidth: 1,
    borderColor: APP_C.border,
  },
  pillActive: { backgroundColor: APP_C.indigo, borderColor: APP_C.indigo },
  pillTxt: { fontSize: 13, fontWeight: '600', color: APP_C.textSub },
  pillTxtActive: { color: '#fff', fontWeight: '700' },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: APP_C.textSub, marginBottom: 6 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: APP_C.bg,
    borderWidth: 1,
    borderColor: APP_C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectError: { borderColor: APP_C.red },
  selectValue: { fontSize: 15, color: APP_C.text, flex: 1 },
  selectPlaceholder: { fontSize: 15, color: APP_C.textMuted, flex: 1 },
  error: { fontSize: 12, color: APP_C.red, marginTop: 4 },
});
