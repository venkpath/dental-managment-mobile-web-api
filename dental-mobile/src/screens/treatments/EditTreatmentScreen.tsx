import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { treatmentService } from '../../services/treatment.service';
import { userService, type StaffUser } from '../../services/user.service';
import { getCurrencySymbol } from '../../utils/format';
import Input from '../../components/Input';
import FormScreenLayout, { FormCard, formInputWrap } from '../../components/FormScreenLayout';
import SelectSheet from '../../components/SelectSheet';
import { SelectField } from '../../components/FormSection';
import Badge from '../../components/Badge';
import { formUi } from '../../theme/appChrome';
import type { Treatment, PatientStackParamList } from '../../types';

const PROCEDURES = [
  'RCT', 'Extraction', 'Filling', 'Crown', 'Bridge',
  'Scaling', 'Implant', 'Orthodontics', 'Denture', 'Teeth Whitening', 'Other',
];

type Route = RouteProp<PatientStackParamList, 'EditTreatment'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
] as const;

type Status = 'planned' | 'in_progress' | 'completed';

export default function EditTreatmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { treatmentId } = route.params;

  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [procedureSheet, setProcedureSheet] = useState(false);
  const [dentistSheet, setDentistSheet] = useState(false);
  const [form, setForm] = useState({
    dentist_id: '',
    tooth_number: '', diagnosis: '', procedure: '',
    status: 'planned' as Status, cost: '', notes: '',
  });

  useFocusEffect(useCallback(() => {
    setFetching(true);
    Promise.all([
      treatmentService.get(treatmentId),
      userService.listStaff().then((staff) => {
        const only = staff.filter((u) => /dentist|consultant/i.test(u.role));
        return only.length > 0 ? only : staff;
      }),
    ])
      .then(([t, staff]) => {
        setTreatment(t);
        setDentists(staff);
        setForm({
          dentist_id: t.dentist?.id ?? '',
          tooth_number: t.tooth_number ?? '',
          diagnosis: t.diagnosis,
          procedure: t.procedure,
          status: (t.status?.toLowerCase() === 'in_progress' ? 'in_progress'
            : t.status?.toLowerCase() === 'completed' ? 'completed' : 'planned') as Status,
          cost: String(t.cost),
          notes: t.notes ?? '',
        });
      })
      .finally(() => setFetching(false));
  }, [treatmentId]));

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.diagnosis.trim()) { Alert.alert('Error', 'Diagnosis is required'); return; }
    if (!form.procedure) { Alert.alert('Error', 'Procedure is required'); return; }
    if (!form.dentist_id) { Alert.alert('Error', 'Dentist is required'); return; }
    setLoading(true);
    try {
      await treatmentService.update(treatmentId, {
        dentist_id: form.dentist_id,
        tooth_number: form.tooth_number.trim() || undefined,
        diagnosis: form.diagnosis.trim(),
        procedure: form.procedure,
        status: form.status,
        cost: parseFloat(form.cost) || 0,
        notes: form.notes.trim() || undefined,
      });
      Alert.alert('Saved', 'Treatment updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = treatment
    ? `${treatment.patient.first_name} ${treatment.patient.last_name}`
    : undefined;

  return (
    <FormScreenLayout
      title="Edit treatment"
      subtitle={subtitle}
      onBack={() => navigation.goBack()}
      booting={fetching || !treatment}
      primaryAction={{ label: 'Save changes', onPress: handleSave, loading }}
    >
      {treatment ? (
        <>
          <View style={formUi.banner}>
            <View style={{ flex: 1 }}>
              <Text style={formUi.bannerTitle}>{treatment.procedure}</Text>
              <Text style={formUi.bannerSub}>Dr. {treatment.dentist.name}</Text>
            </View>
            <Badge label={treatment.status} variant={treatment.status as 'planned' | 'in_progress' | 'completed'} />
          </View>

          <FormCard title="Status">
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
          </FormCard>

          <FormCard title="Treatment details">
            <SelectField
              label="Procedure *"
              value={form.procedure}
              placeholder="Select procedure"
              onPress={() => setProcedureSheet(true)}
            />
            <SelectField
              label="Dentist *"
              value={dentists.find((d) => d.id === form.dentist_id)?.name ? `Dr. ${dentists.find((d) => d.id === form.dentist_id)!.name}` : ''}
              placeholder="Select dentist"
              onPress={() => setDentistSheet(true)}
            />
            <Input label="Diagnosis *" value={form.diagnosis} onChangeText={(v) => set('diagnosis', v)}
              containerStyle={formInputWrap.tight} />
            <Input label="Tooth number (FDI)" value={form.tooth_number} onChangeText={(v) => set('tooth_number', v)}
              placeholder="e.g. 16, 21, 36" containerStyle={formInputWrap.tight} />
            <Input
              label={`Cost (${getCurrencySymbol()})`}
              value={form.cost}
              onChangeText={(v) => set('cost', v)}
              keyboardType="decimal-pad"
              prefix={getCurrencySymbol()}
              containerStyle={formInputWrap.tight}
            />
            <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)}
              multiline numberOfLines={3} textAlignVertical="top"
              style={{ minHeight: 72, paddingTop: 8 }} containerStyle={formInputWrap.tight}
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
        </>
      ) : null}
    </FormScreenLayout>
  );
}
