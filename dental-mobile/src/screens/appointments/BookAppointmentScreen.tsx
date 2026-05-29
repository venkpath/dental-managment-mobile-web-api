import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/appointment.service';
import { userService, type StaffUser } from '../../services/user.service';
import { addMinutes } from '../../utils/time';
import { formatSlotRange } from '../../utils/appointmentSlots';
import type { AvailableSlot } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import PatientSearchInput from '../../components/PatientSearchInput';
import DatePickerInput from '../../components/DatePickerInput';
import SelectSheet from '../../components/SelectSheet';
import AppointmentSlotPicker from '../../components/AppointmentSlotPicker';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { AppointmentStackParamList } from '../../types';

type Route = RouteProp<AppointmentStackParamList, 'BookAppointment'>;
type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6',
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookAppointmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { branchId } = useAuthStore();

  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(
    route.params?.patientId ? { id: route.params.patientId, name: '' } : null,
  );
  const [form, setForm] = useState({
    dentist_id: '',
    appointment_date: todayIso(),
    start_time: '',
    end_time: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingDentists, setLoadingDentists] = useState(true);
  const [dentistSheet, setDentistSheet] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useFocusEffect(useCallback(() => {
    setLoadingDentists(true);
    userService.listStaff()
      .then((staff) => {
        const only = staff.filter((u) => /dentist|consultant/i.test(u.role));
        setDentists(only.length > 0 ? only : staff);
      })
      .catch(() => setDentists([]))
      .finally(() => setLoadingDentists(false));
  }, []));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const fetchSlots = useCallback(async (dentistId: string, date: string) => {
    if (!branchId || !dentistId || !date) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    try {
      setAvailableSlots(await appointmentService.getAvailableSlots({
        branch_id: branchId,
        dentist_id: dentistId,
        date,
      }));
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [branchId]);

  const onDentistChange = (dentistId: string) => {
    set('dentist_id', dentistId);
    setForm((p) => ({ ...p, start_time: '', end_time: '' }));
    if (dentistId) fetchSlots(dentistId, form.appointment_date);
  };

  const onDateChange = (date: string) => {
    set('appointment_date', date);
    setForm((p) => ({ ...p, start_time: '', end_time: '' }));
    if (form.dentist_id) fetchSlots(form.dentist_id, date);
  };

  const pickTimeSlot = (slot: AvailableSlot) => {
    setForm((p) => ({ ...p, start_time: slot.start_time, end_time: slot.end_time }));
    setErrors((p) => ({ ...p, start_time: '' }));
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
    if (!branchId) {
      Alert.alert('Error', 'No branch assigned');
      return;
    }
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
      Alert.alert(
        'Booked',
        `Appointment on ${form.appointment_date} at ${formatSlotRange(form.start_time, form.end_time)}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const dentistName = dentists.find((d) => d.id === form.dentist_id)?.name;

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top, backgroundColor: C.bg }}>
        <View style={ui.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ui.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ui.topTitle}>Book appointment</Text>
            <Text style={ui.topSub}>Schedule a new visit</Text>
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + bottomInset, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Patient</Text>
          <PatientSearchInput
            selectedPatient={selectedPatient}
            onSelect={(p) => { setSelectedPatient(p.id ? p : null); setErrors((e) => ({ ...e, patient_id: '' })); }}
            error={errors.patient_id}
          />
        </View>

        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Schedule</Text>
          <Text style={ui.fieldLabel}>Dentist *</Text>
          <TouchableOpacity
            style={[ui.field, errors.dentist_id && ui.fieldError]}
            onPress={() => {
              if (loadingDentists) return;
              setDentistSheet(true);
            }}
            activeOpacity={0.7}
          >
            {loadingDentists ? (
              <ActivityIndicator color={C.indigo} style={{ flex: 1 }} />
            ) : (
              <Text style={[ui.fieldTxt, !dentistName && ui.placeholder]}>
                {dentistName ? `Dr. ${dentistName}` : 'Select dentist'}
              </Text>
            )}
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>
          {errors.dentist_id ? <Text style={ui.errorTxt}>{errors.dentist_id}</Text> : null}

          <View style={{ marginTop: 12 }}>
            <DatePickerInput
              label="Date *"
              value={form.appointment_date}
              onChange={onDateChange}
              minDate={new Date()}
              error={errors.appointment_date}
            />
          </View>
        </View>

        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Time slot *</Text>
          {!form.dentist_id ? (
            <Text style={ui.hint}>Select a dentist and date to see available slots.</Text>
          ) : (
            <>
              {form.start_time ? (
                <View style={ui.selectedSlot}>
                  <Ionicons name="checkmark-circle" size={18} color={C.indigo} />
                  <Text style={ui.selectedSlotTxt}>
                    {formatSlotRange(form.start_time, form.end_time)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setForm((p) => ({ ...p, start_time: '', end_time: '' }))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={ui.changeTxt}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <AppointmentSlotPicker
                slots={availableSlots}
                selectedStartTime={form.start_time}
                onSelect={pickTimeSlot}
                loading={loadingSlots}
              />
              {errors.start_time ? <Text style={ui.errorTxt}>{errors.start_time}</Text> : null}
            </>
          )}
        </View>

        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Notes</Text>
          <TextInput
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder="Reason for visit, special instructions…"
            placeholderTextColor={C.textMuted}
            multiline
            style={[ui.inputBox, { minHeight: 72, textAlignVertical: 'top' }]}
          />
        </View>
      </ScrollView>

      <View style={[ui.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity
          style={[ui.primaryBtn, loading && ui.btnDisabled]}
          onPress={handleBook}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryTxt}>Book appointment</Text>}
        </TouchableOpacity>
      </View>

      <SelectSheet
        visible={dentistSheet}
        title="Dentist"
        options={dentists.map((d) => ({ value: d.id, label: `Dr. ${d.name}` }))}
        selectedValue={form.dentist_id}
        onSelect={onDentistChange}
        onClose={() => setDentistSheet(false)}
      />
    </KeyboardAvoidingView>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  topTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  topSub: { fontSize: 12, color: C.textSub, marginTop: 1 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', minHeight: 48,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, backgroundColor: C.bg, gap: 8,
  },
  fieldError: { borderColor: '#dc2626' },
  fieldTxt: { flex: 1, fontSize: 15, color: C.text },
  placeholder: { color: C.textMuted },
  hint: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  errorTxt: { fontSize: 12, color: '#dc2626', marginTop: 6 },
  selectedSlot: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.indigoLight, borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  selectedSlotTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: C.indigo },
  changeTxt: { fontSize: 13, fontWeight: '700', color: C.indigo },
  inputBox: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text, backgroundColor: C.bg,
  },
  footer: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  primaryBtn: {
    backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  primaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
});