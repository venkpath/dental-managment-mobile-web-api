import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { treatmentService } from '../../services/treatment.service';
import { userService, type StaffUser } from '../../services/user.service';
import { useAuthStore } from '../../store/auth.store';
import { getCurrencySymbol } from '../../utils/format';
import Input from '../../components/Input';
import FormScreenLayout, { FormCard, formInputWrap } from '../../components/FormScreenLayout';
import SelectSheet from '../../components/SelectSheet';
import { SelectField } from '../../components/FormSection';
import { formUi } from '../../theme/appChrome';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'AddTreatment'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const PROCEDURES = [
  'RCT', 'Extraction', 'Filling', 'Crown', 'Bridge',
  'Scaling', 'Implant', 'Orthodontics', 'Denture', 'Teeth Whitening', 'Other',
];

const STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
] as const;

type Status = 'planned' | 'in_progress' | 'completed';

export default function AddTreatmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId, patientName } = route.params;
  const { branchId, user } = useAuthStore();

  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [form, setForm] = useState({
    dentist_id: user?.id ?? '',
    tooth_number: '',
    diagnosis: '',
    procedure: '',
    status: 'planned' as Status,
    cost: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [procedureSheet, setProcedureSheet] = useState(false);
  const [dentistSheet, setDentistSheet] = useState(false);

  useFocusEffect(useCallback(() => {
    userService.listStaff().then(setDentists).catch(() => {});
  }, []));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.diagnosis.trim()) e.diagnosis = 'Required';
    if (!form.procedure) e.procedure = 'Select a procedure';
    if (!form.dentist_id) e.dentist_id = 'Select a dentist';
    if (!form.cost || isNaN(Number(form.cost)) || Number(form.cost) < 0) e.cost = 'Enter valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!branchId) { Alert.alert('Error', 'No branch assigned'); return; }
    setLoading(true);
    try {
      await treatmentService.create({
        patient_id: patientId,
        branch_id: branchId,
        dentist_id: form.dentist_id,
        tooth_number: form.tooth_number.trim() || undefined,
        diagnosis: form.diagnosis.trim(),
        procedure: form.procedure,
        status: form.status,
        cost: parseFloat(form.cost) || 0,
        notes: form.notes.trim() || undefined,
      });
      Alert.alert('Saved', 'Treatment added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const selectedDentist = dentists.find((d) => d.id === form.dentist_id);

  return (
    <FormScreenLayout
      title="Add treatment"
      subtitle={patientName}
      onBack={() => navigation.goBack()}
      primaryAction={{ label: 'Save treatment', onPress: handleSave, loading }}
    >
      <FormCard title="Procedure">
        <SelectField
          label="Procedure *"
          value={form.procedure}
          placeholder="Select procedure"
          error={errors.procedure}
          onPress={() => setProcedureSheet(true)}
        />
        <SelectField
          label="Dentist *"
          value={selectedDentist ? `Dr. ${selectedDentist.name}` : ''}
          placeholder="Select dentist"
          error={errors.dentist_id}
          onPress={() => setDentistSheet(true)}
        />
        <Input label="Tooth number (FDI)" value={form.tooth_number} onChangeText={(v) => set('tooth_number', v)}
          placeholder="e.g. 16, 21, 36" containerStyle={formInputWrap.tight} />
      </FormCard>

      <FormCard title="Clinical details">
        <Input label="Diagnosis *" value={form.diagnosis} onChangeText={(v) => set('diagnosis', v)}
          placeholder="e.g. Deep caries with pulp involvement" error={errors.diagnosis}
          containerStyle={formInputWrap.tight} />

        <View>
          <Text style={formUi.fieldLabel}>Status</Text>
          <View style={formUi.statusRow}>
            {STATUSES.map((st) => (
              <TouchableOpacity
                key={st.value}
                style={[formUi.statusBtn, form.status === st.value && formUi.statusBtnActive]}
                onPress={() => setForm((p) => ({ ...p, status: st.value }))}
                activeOpacity={0.7}
              >
                <Text style={[formUi.statusTxt, form.status === st.value && formUi.statusTxtActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label={`Cost (${getCurrencySymbol()}) *`}
          value={form.cost}
          onChangeText={(v) => set('cost', v)}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={errors.cost}
          prefix={getCurrencySymbol()}
          containerStyle={formInputWrap.tight}
        />
        <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)}
          placeholder="Additional notes…" multiline numberOfLines={3}
          textAlignVertical="top" style={{ minHeight: 72, paddingTop: 8 }}
          containerStyle={formInputWrap.tight}
        />
      </FormCard>

      <SelectSheet
        visible={procedureSheet}
        title="Procedure"
        options={PROCEDURES.map((p) => ({ value: p, label: p }))}
        selectedValue={form.procedure}
        onSelect={(v) => set('procedure', v)}
        onClose={() => setProcedureSheet(false)}
      />
      <SelectSheet
        visible={dentistSheet}
        title="Dentist"
        options={dentists.map((d) => ({ value: d.id, label: `Dr. ${d.name}` }))}
        selectedValue={form.dentist_id}
        onSelect={(v) => set('dentist_id', v)}
        onClose={() => setDentistSheet(false)}
      />
    </FormScreenLayout>
  );
}
