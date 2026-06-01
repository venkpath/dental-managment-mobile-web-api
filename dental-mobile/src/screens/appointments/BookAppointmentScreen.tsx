import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/appointment.service';
import { branchService } from '../../services/branch.service';
import { userService, type StaffUser } from '../../services/user.service';
import { addMinutes } from '../../utils/time';
import { formatSlotRange } from '../../utils/appointmentSlots';
import type { AvailableSlot } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import PatientSearchInput from '../../components/PatientSearchInput';
import DatePickerInput from '../../components/DatePickerInput';
import SelectSheet from '../../components/SelectSheet';
import AppointmentSlotPicker from '../../components/AppointmentSlotPicker';
import Input from '../../components/Input';
import FormScreenLayout, { FormCard, formInputWrap } from '../../components/FormScreenLayout';
import { SelectField } from '../../components/FormSection';
import { APP_C, formUi } from '../../theme/appChrome';
import type { AppointmentStackParamList, Branch } from '../../types';

type Route = RouteProp<AppointmentStackParamList, 'BookAppointment'>;
type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookAppointmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { branchId: authBranchId } = useAuthStore();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(authBranchId ?? '');
  const [branchSheet, setBranchSheet] = useState(false);
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
  const [booting, setBooting] = useState(true);
  const [dentistSheet, setDentistSheet] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useFocusEffect(useCallback(() => {
    setBooting(true);
    Promise.all([userService.listStaff(), branchService.list()])
      .then(([staff, brs]) => {
        const only = staff.filter((u) => /dentist|consultant/i.test(u.role));
        setDentists(only.length > 0 ? only : staff);
        setBranches(brs);
        setSelectedBranchId((prev) => prev || authBranchId || brs[0]?.id || '');
      })
      .catch(() => setDentists([]))
      .finally(() => setBooting(false));
  }, [authBranchId]));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const fetchSlots = useCallback(async (dentistId: string, date: string, branch = selectedBranchId) => {
    if (!branch || !dentistId || !date) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    try {
      setAvailableSlots(await appointmentService.getAvailableSlots({
        branch_id: branch,
        dentist_id: dentistId,
        date,
      }));
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedBranchId]);

  const onBranchChange = (branch: string) => {
    setSelectedBranchId(branch);
    setForm((p) => ({ ...p, start_time: '', end_time: '' }));
    if (form.dentist_id) fetchSlots(form.dentist_id, form.appointment_date, branch);
  };

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
    if (!selectedBranchId) {
      Alert.alert('Error', 'Select a branch');
      return;
    }
    setLoading(true);
    try {
      await appointmentService.create({
        patient_id: selectedPatient!.id,
        dentist_id: form.dentist_id,
        branch_id: selectedBranchId,
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
  const branchName = branches.find((b) => b.id === selectedBranchId)?.name ?? '';
  const dentistLabel = booting
    ? 'Loading dentists…'
    : dentistName
      ? `Dr. ${dentistName}`
      : '';

  return (
    <FormScreenLayout
      title="Book appointment"
      subtitle="Schedule a new visit"
      onBack={() => navigation.goBack()}
      booting={booting}
      bootMessage="Loading schedule…"
      primaryAction={{ label: 'Book appointment', onPress: handleBook, loading }}
    >
      <FormCard title="Patient">
        <PatientSearchInput
          selectedPatient={selectedPatient}
          onSelect={(p) => {
            setSelectedPatient(p.id ? p : null);
            setErrors((e) => ({ ...e, patient_id: '' }));
          }}
          error={errors.patient_id}
        />
      </FormCard>

      <FormCard title="Schedule">
        {branches.length > 1 ? (
          <SelectField
            label="Branch *"
            value={branchName}
            placeholder="Select branch"
            onPress={() => setBranchSheet(true)}
          />
        ) : null}
        <SelectField
          label="Dentist *"
          value={dentistLabel}
          placeholder="Select dentist"
          error={errors.dentist_id}
          onPress={() => {
            if (!booting) setDentistSheet(true);
          }}
        />
        <DatePickerInput
          label="Date *"
          value={form.appointment_date}
          onChange={onDateChange}
          minDate={new Date()}
          error={errors.appointment_date}
        />
      </FormCard>

      <FormCard title="Time slot">
        {!form.dentist_id ? (
          <Text style={formUi.hint}>Select a dentist and date to see available slots.</Text>
        ) : (
          <>
            {form.start_time ? (
              <View style={slotStyles.selected}>
                <Ionicons name="checkmark-circle" size={18} color={APP_C.indigo} />
                <Text style={slotStyles.selectedTxt}>
                  {formatSlotRange(form.start_time, form.end_time)}
                </Text>
                <TouchableOpacity
                  onPress={() => setForm((p) => ({ ...p, start_time: '', end_time: '' }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={slotStyles.change}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {loadingSlots ? (
              <View style={slotStyles.loadingRow}>
                <ActivityIndicator color={APP_C.indigo} />
                <Text style={formUi.hint}>Loading available slots…</Text>
              </View>
            ) : (
              <AppointmentSlotPicker
                slots={availableSlots}
                selectedStartTime={form.start_time}
                onSelect={pickTimeSlot}
                loading={false}
              />
            )}
            {errors.start_time ? <Text style={formUi.errorTxt}>{errors.start_time}</Text> : null}
          </>
        )}
      </FormCard>

      <FormCard title="Visit notes">
        <Input
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          placeholder="Reason for visit, special instructions… (optional)"
          multiline
          numberOfLines={4}
          containerStyle={formInputWrap.tight}
        />
      </FormCard>

      <SelectSheet
        visible={branchSheet}
        title="Branch"
        options={branches.map((b) => ({ value: b.id, label: b.name }))}
        selectedValue={selectedBranchId}
        onSelect={onBranchChange}
        onClose={() => setBranchSheet(false)}
      />
      <SelectSheet
        visible={dentistSheet}
        title="Dentist"
        options={dentists.map((d) => ({ value: d.id, label: `Dr. ${d.name}` }))}
        selectedValue={form.dentist_id}
        onSelect={onDentistChange}
        onClose={() => setDentistSheet(false)}
      />
    </FormScreenLayout>
  );
}

const slotStyles = StyleSheet.create({
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: APP_C.indigoLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  selectedTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: APP_C.indigo },
  change: { fontSize: 13, fontWeight: '700', color: APP_C.indigo },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});
