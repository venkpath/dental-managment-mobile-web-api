import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing, typography, radius } from '../theme';
import { getLocale } from '../utils/format';

interface Props {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string;
  maxDate?: Date;
  minDate?: Date;
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  error,
  maxDate = new Date(),
  minDate,
}: Props) {
  const [show, setShow] = useState(false);

  const parsed = value ? new Date(value + 'T12:00:00') : new Date();

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShow(Platform.OS === 'ios'); // stay open on iOS until dismissed
    if (selected) {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  const displayValue = value
    ? new Date(value + 'T12:00:00').toLocaleDateString(getLocale(), {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'Select date';

  // Calculate age from DOB
  const age = value
    ? Math.floor((Date.now() - new Date(value + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.calIcon}>📅</Text>
        <Text style={[styles.valueText, !value && styles.placeholder]}>
          {displayValue}
          {age !== null && age >= 0 && age <= 120 ? `  (${age} yrs)` : ''}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {show && (
        <DateTimePicker
          value={parsed}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          maximumDate={maxDate}
          minimumDate={minDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: typography.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    minHeight: 50,
  },
  triggerError: { borderColor: colors.danger },
  calIcon: { fontSize: 18 },
  valueText: { flex: 1, fontSize: typography.base, color: colors.text },
  placeholder: { color: colors.textMuted },
  chevron: { fontSize: 11, color: colors.textMuted },
  errorText: { fontSize: typography.xs, color: colors.danger, marginTop: spacing.xs, fontWeight: '500' },
});
