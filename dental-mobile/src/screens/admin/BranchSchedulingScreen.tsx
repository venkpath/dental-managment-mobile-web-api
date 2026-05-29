import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { branchService } from '../../services/branch.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { FormSection, PillRow } from '../../components/FormSection';
import { colors, spacing, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'BranchScheduling'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const DAY_OPTS = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '7', label: 'Sun' },
];

const SLOT_OPTS = [
  { value: '15', label: '15m' },
  { value: '20', label: '20m' },
  { value: '30', label: '30m' },
  { value: '45', label: '45m' },
  { value: '60', label: '60m' },
];

function parseDays(csv?: string | null): Set<string> {
  if (!csv?.trim()) return new Set(['1', '2', '3', '4', '5', '6']);
  return new Set(csv.split(',').map((d) => d.trim()).filter(Boolean));
}

function daysToCsv(days: Set<string>): string {
  return [...days].sort((a, b) => Number(a) - Number(b)).join(',');
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function BranchSchedulingScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { branchId } = route.params;
  const bottomInset = useBottomInset();

  const [branchName, setBranchName] = useState('');
  const [form, setForm] = useState({
    working_start_time: '09:00',
    working_end_time: '18:00',
    lunch_start_time: '',
    lunch_end_time: '',
    slot_duration: '15',
    default_appt_duration: '30',
    buffer_minutes: '0',
    advance_booking_days: '30',
    room_cleaning_duration_minutes: '2',
    working_days: new Set(['1', '2', '3', '4', '5', '6']),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  useFocusEffect(useCallback(() => {
    Promise.all([
      branchService.get(branchId).catch(() => null),
      branchService.getScheduling(branchId).catch(() => null),
    ])
      .then(([branch, sch]) => {
        if (branch?.name) setBranchName(branch.name);
        if (sch) {
          setForm({
            working_start_time: sch.working_start_time ?? '09:00',
            working_end_time: sch.working_end_time ?? '18:00',
            lunch_start_time: sch.lunch_start_time ?? '',
            lunch_end_time: sch.lunch_end_time ?? '',
            slot_duration: String(sch.slot_duration ?? 15),
            default_appt_duration: String(sch.default_appt_duration ?? 30),
            buffer_minutes: String(sch.buffer_minutes ?? 0),
            advance_booking_days: String(sch.advance_booking_days ?? 30),
            room_cleaning_duration_minutes: String(sch.room_cleaning_duration_minutes ?? 2),
            working_days: parseDays(sch.working_days),
          });
        } else if (branch?.working_days) {
          setForm((p) => ({ ...p, working_days: parseDays(branch.working_days) }));
        }
      })
      .catch(() => Alert.alert('Error', 'Could not load scheduling settings'))
      .finally(() => setBooting(false));
  }, [branchId]));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const toggleDay = (d: string) => {
    setForm((p) => {
      const next = new Set(p.working_days);
      if (next.has(d)) {
        if (next.size <= 1) return p;
        next.delete(d);
      } else {
        next.add(d);
      }
      return { ...p, working_days: next };
    });
    setErrors((e) => ({ ...e, working_days: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!TIME_RE.test(form.working_start_time)) e.working_start_time = 'Required (HH:MM)';
    if (!TIME_RE.test(form.working_end_time)) e.working_end_time = 'Required (HH:MM)';
    if (form.lunch_start_time.trim() && !TIME_RE.test(form.lunch_start_time)) {
      e.lunch_start_time = 'Use HH:MM';
    }
    if (form.lunch_end_time.trim() && !TIME_RE.test(form.lunch_end_time)) {
      e.lunch_end_time = 'Use HH:MM';
    }
    const apptDur = Number(form.default_appt_duration);
    if (isNaN(apptDur) || apptDur < 10 || apptDur > 240) {
      e.default_appt_duration = 'Must be 10–240';
    }
    const buffer = Number(form.buffer_minutes);
    if (isNaN(buffer) || buffer < 0 || buffer > 60) e.buffer_minutes = 'Must be 0–60';
    const advance = Number(form.advance_booking_days);
    if (form.advance_booking_days.trim() && (isNaN(advance) || advance < 0 || advance > 365)) {
      e.advance_booking_days = 'Must be 0–365';
    }
    const cleaning = Number(form.room_cleaning_duration_minutes);
    if (isNaN(cleaning) || cleaning < 1 || cleaning > 60) {
      e.room_cleaning_duration_minutes = 'Must be 1–60';
    }
    if (form.working_days.size === 0) e.working_days = 'Select at least one day';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        working_start_time: form.working_start_time,
        working_end_time: form.working_end_time,
        slot_duration: Number(form.slot_duration),
        default_appt_duration: Number(form.default_appt_duration),
        buffer_minutes: Number(form.buffer_minutes),
        working_days: daysToCsv(form.working_days),
        room_cleaning_duration_minutes: Number(form.room_cleaning_duration_minutes),
      };
      if (form.lunch_start_time.trim()) payload.lunch_start_time = form.lunch_start_time.trim();
      else payload.lunch_start_time = null;
      if (form.lunch_end_time.trim()) payload.lunch_end_time = form.lunch_end_time.trim();
      else payload.lunch_end_time = null;
      const advance = Number(form.advance_booking_days);
      if (form.advance_booking_days.trim() && !isNaN(advance)) {
        payload.advance_booking_days = advance;
      }
      await branchService.updateScheduling(branchId, payload);
      Alert.alert('Saved', 'Scheduling settings updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScreenHeader title="Scheduling" onBack={() => navigation.goBack()} />
        <View style={s.center}><Text style={s.muted}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader
        title="Scheduling"
        subtitle={branchName || undefined}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]} keyboardShouldPersistTaps="handled">
          <Text style={s.sectionHead}>Working hours</Text>
          <Input
            label="Opens at (HH:MM) *"
            value={form.working_start_time}
            onChangeText={(v) => set('working_start_time', v)}
            error={errors.working_start_time}
            placeholder="09:00"
          />
          <Input
            label="Closes at (HH:MM) *"
            value={form.working_end_time}
            onChangeText={(v) => set('working_end_time', v)}
            error={errors.working_end_time}
            placeholder="18:00"
          />

          <Text style={s.sectionHead}>Lunch break (optional)</Text>
          <Input
            label="Lunch starts"
            value={form.lunch_start_time}
            onChangeText={(v) => set('lunch_start_time', v)}
            error={errors.lunch_start_time}
            placeholder="13:00"
          />
          <Input
            label="Lunch ends"
            value={form.lunch_end_time}
            onChangeText={(v) => set('lunch_end_time', v)}
            error={errors.lunch_end_time}
            placeholder="14:00"
          />

          <Text style={s.sectionHead}>Appointment settings</Text>
          <FormSection title="Slot interval (min)">
            <PillRow
              options={SLOT_OPTS}
              value={form.slot_duration}
              onChange={(v) => set('slot_duration', v)}
            />
          </FormSection>
          <Input
            label="Default appointment (min)"
            value={form.default_appt_duration}
            onChangeText={(v) => set('default_appt_duration', v)}
            keyboardType="number-pad"
            error={errors.default_appt_duration}
          />
          <Input
            label="Buffer between appointments (min)"
            value={form.buffer_minutes}
            onChangeText={(v) => set('buffer_minutes', v)}
            keyboardType="number-pad"
            error={errors.buffer_minutes}
          />
          <Text style={s.hint}>Gap between consecutive appointments.</Text>
          <Input
            label="Room cleaning timer (min)"
            value={form.room_cleaning_duration_minutes}
            onChangeText={(v) => set('room_cleaning_duration_minutes', v)}
            keyboardType="number-pad"
            error={errors.room_cleaning_duration_minutes}
          />
          <Text style={s.hint}>Auto-releases room after patient leaves (default 2).</Text>
          <Input
            label="Advance booking (days, optional)"
            value={form.advance_booking_days}
            onChangeText={(v) => set('advance_booking_days', v)}
            keyboardType="number-pad"
            error={errors.advance_booking_days}
          />

          <FormSection title="Working days">
            <View style={s.dayRow}>
              {DAY_OPTS.map((d) => {
                const active = form.working_days.has(d.value);
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[s.dayPill, active && s.dayPillOn]}
                    onPress={() => toggleDay(d.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dayTxt, active && s.dayTxtOn]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.working_days ? <Text style={s.error}>{errors.working_days}</Text> : null}
          </FormSection>

          <Button title="Save settings" onPress={handleSave} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  sectionHead: {
    fontSize: 13, fontWeight: '800', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8,
  },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: -4 },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayTxt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  dayTxtOn: { color: '#fff' },
});
