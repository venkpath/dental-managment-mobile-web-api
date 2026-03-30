import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/appointment.service';
import { userService, type StaffUser } from '../../services/user.service';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import PatientSearchInput from '../../components/PatientSearchInput';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { AppointmentStackParamList } from '../../types';

type Route = RouteProp<AppointmentStackParamList, 'BookAppointment'>;
type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

// Quick time slots
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export default function BookAppointmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { branchId } = useAuthStore();
  const bottomInset = useBottomInset();

  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(
    route.params?.patientId ? { id: route.params.patientId, name: '' } : null
  );
  const [form, setForm] = useState({
    dentist_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showDentists, setShowDentists] = useState(false);
  const [showSlots, setShowSlots] = useState(false);

  useFocusEffect(useCallback(() => {
    userService.listStaff().then(setDentists).catch(() => {});
  }, []));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const pickTimeSlot = (slot: string) => {
    setForm((p) => ({ ...p, start_time: slot, end_time: addMinutes(slot, 30) }));
    setErrors((p) => ({ ...p, start_time: '' }));
    setShowSlots(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedPatient?.id) e.patient_id = 'Select a patient';
    if (!form.dentist_id) e.dentist_id = 'Select a dentist';
    if (!form.appointment_date) e.appointment_date = 'Select a date';
    if (!form.start_time) e.start_time = 'Select a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleBook = async () => {
    if (!validate()) return;
    if (!branchId) { Alert.alert('Error', 'No branch assigned'); return; }
    setLoading(true);
    try {
      await appointmentService.create({
        patient_id: selectedPatient!.id,
        dentist_id: form.dentist_id,
        branch_id: branchId,
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        end_time: form.end_time || addMinutes(form.start_time, 30),
        notes: form.notes.trim() || undefined,
      });
      Alert.alert('Booked!', `Appointment on ${form.appointment_date} at ${form.start_time}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedDentist = dentists.find((d) => d.id === form.dentist_id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Book Appointment" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PatientSearchInput
            selectedPatient={selectedPatient}
            onSelect={(p) => { setSelectedPatient(p); setErrors((e) => ({ ...e, patient_id: '' })); }}
            error={errors.patient_id}
          />

          {/* Dentist selector */}
          <Text style={styles.fieldLabel}>Dentist *</Text>
          <TouchableOpacity style={[styles.selector, errors.dentist_id && styles.selectorError]}
            onPress={() => setShowDentists((p) => !p)}>
            <Text style={[styles.selectorText, !selectedDentist && styles.placeholder]}>
              {selectedDentist ? `Dr. ${selectedDentist.name}` : 'Select dentist'}
            </Text>
            <Text style={styles.chevron}>{showDentists ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.dentist_id && <Text style={styles.errorText}>{errors.dentist_id}</Text>}
          {showDentists && (
            <View style={styles.dropdown}>
              {dentists.map((d) => (
                <TouchableOpacity key={d.id}
                  style={[styles.dropItem, form.dentist_id === d.id && styles.dropItemActive]}
                  onPress={() => { set('dentist_id', d.id); setShowDentists(false); }}>
                  <Text style={[styles.dropText, form.dentist_id === d.id && styles.dropTextActive]}>
                    Dr. {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Input
            label="Date *"
            value={form.appointment_date}
            onChangeText={(v) => set('appointment_date', v)}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.appointment_date}
          />

          {/* Time slot picker */}
          <Text style={styles.fieldLabel}>Time Slot *</Text>
          <TouchableOpacity style={[styles.selector, errors.start_time && styles.selectorError]}
            onPress={() => setShowSlots((p) => !p)}>
            <Text style={[styles.selectorText, !form.start_time && styles.placeholder]}>
              {form.start_time ? `${form.start_time} – ${form.end_time}` : 'Select time slot'}
            </Text>
            <Text style={styles.chevron}>{showSlots ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.start_time && <Text style={styles.errorText}>{errors.start_time}</Text>}
          {showSlots && (
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity key={slot}
                  style={[styles.slotBtn, form.start_time === slot && styles.slotBtnActive]}
                  onPress={() => pickTimeSlot(slot)}>
                  <Text style={[styles.slotText, form.start_time === slot && styles.slotTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Input
            label="Custom Start Time (if not in list)"
            value={form.start_time}
            onChangeText={(v) => { set('start_time', v); if (v.length === 5) set('end_time', addMinutes(v, 30)); }}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            containerStyle={{ marginTop: spacing.sm }}
          />

          <Input
            label="End Time"
            value={form.end_time}
            onChangeText={(v) => set('end_time', v)}
            placeholder="HH:MM (auto-filled +30 min)"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <Input
            label="Notes"
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder="Reason for visit, special instructions..."
            multiline numberOfLines={2}
            textAlignVertical="top"
            style={{ minHeight: 60, paddingTop: spacing.sm }}
          />

          <Button title="Book Appointment" onPress={handleBook} loading={loading} size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.base },
  fieldLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  errorText: { fontSize: typography.xs, color: colors.danger, marginTop: spacing.xs, fontWeight: '500' },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    minHeight: 50, marginBottom: spacing.xs,
  },
  selectorError: { borderColor: colors.danger },
  selectorText: { fontSize: typography.base, color: colors.text },
  placeholder: { color: colors.textMuted },
  chevron: { fontSize: 12, color: colors.textMuted },
  dropdown: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden',
  },
  dropItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  dropItemActive: { backgroundColor: colors.primaryLight },
  dropText: { fontSize: typography.base, color: colors.text },
  dropTextActive: { color: colors.primary, fontWeight: '600' },
  slotsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    marginBottom: spacing.md, marginTop: spacing.xs,
  },
  slotBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  slotText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  slotTextActive: { color: colors.primary, fontWeight: '700' },
});
