import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { spacing, typography } from '../theme';
import { APP_C } from '../theme/appChrome';
import { getLocale } from '../utils/format';

interface Props {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string;
  maxDate?: Date;
  minDate?: Date;
  /** Show patient age — only for date-of-birth fields, not appointments/invoices. */
  showAge?: boolean;
}

function ageFromDob(isoDate: string): number | null {
  const dob = new Date(isoDate + 'T12:00:00');
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(value: string): Date {
  return value ? new Date(value + 'T12:00:00') : new Date();
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  error,
  maxDate,
  minDate,
  showAge = false,
}: Props) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(() => parseIso(value));

  useEffect(() => {
    if (!show) setDraft(parseIso(value));
  }, [value, show]);

  const parsed = parseIso(value);

  const openPicker = () => {
    setDraft(parsed);
    setShow(true);
  };

  const closePicker = () => setShow(false);

  const applyDate = (d: Date) => onChange(toIsoDate(d));

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (event.type === 'dismissed' || !selected) return;
    applyDate(selected);
  };

  const handleIosDraftChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDraft(selected);
  };

  const confirmIos = () => {
    applyDate(draft);
    closePicker();
  };

  const displayValue = value
    ? parsed.toLocaleDateString(getLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Select date';

  const age = showAge && value ? ageFromDob(value) : null;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text style={styles.calIcon}>📅</Text>
        <Text style={[styles.valueText, !value && styles.placeholder]}>
          {displayValue}
          {age !== null && age >= 0 && age <= 150 ? `  (${age} ${age === 1 ? 'yr' : 'yrs'})` : ''}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          {...(maxDate ? { maximumDate: maxDate } : {})}
          {...(minDate ? { minimumDate: minDate } : {})}
        />
      )}

      {show && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide" onRequestClose={closePicker}>
          <Pressable style={styles.backdrop} onPress={closePicker}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <View style={styles.toolbar}>
                <TouchableOpacity onPress={closePicker} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.cancelBtn}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>{label ?? 'Select date'}</Text>
                <TouchableOpacity onPress={confirmIos} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.doneBtn}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                onChange={handleIosDraftChange}
                style={styles.iosPicker}
                {...(maxDate ? { maximumDate: maxDate } : {})}
                {...(minDate ? { minimumDate: minDate } : {})}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 0 },
  label: { fontSize: 13, fontWeight: '600', color: APP_C.textSub, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: APP_C.bg,
    borderWidth: 1,
    borderColor: APP_C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  triggerError: { borderColor: APP_C.red },
  calIcon: { fontSize: 18 },
  valueText: { flex: 1, fontSize: typography.base, color: APP_C.text },
  placeholder: { color: APP_C.textMuted },
  chevron: { fontSize: 11, color: APP_C.textMuted },
  errorText: { fontSize: 12, color: APP_C.red, marginTop: 4, fontWeight: '500' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: APP_C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: APP_C.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: APP_C.border,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: APP_C.text },
  cancelBtn: { fontSize: 15, fontWeight: '600', color: APP_C.textSub },
  doneBtn: { fontSize: 15, fontWeight: '700', color: APP_C.indigo },
  iosPicker: { height: 216, alignSelf: 'stretch' },
});
