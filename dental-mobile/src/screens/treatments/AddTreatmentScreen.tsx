import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { treatmentService } from '../../services/treatment.service';
import { userService, type StaffUser } from '../../services/user.service';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'AddTreatment'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const PROCEDURES = [
  'Root Canal Treatment', 'Extraction', 'Filling', 'Crown', 'Bridge',
  'Scaling', 'Implant', 'Orthodontics', 'Denture', 'Teeth Whitening', 'Other',
];

const STATUSES = [
  { value: 'PLANNED', label: '📋 Planned' },
  { value: 'IN_PROGRESS', label: '⚙️ In Progress' },
  { value: 'COMPLETED', label: '✅ Completed' },
] as const;

type Status = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

export default function AddTreatmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId, patientName } = route.params;
  const { branchId, user } = useAuthStore();
  const bottomInset = useBottomInset();

  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [form, setForm] = useState({
    dentist_id: user?.id ?? '',
    tooth_number: '',
    diagnosis: '',
    procedure: '',
    status: 'PLANNED' as Status,
    cost: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showProcedures, setShowProcedures] = useState(false);
  const [showDentists, setShowDentists] = useState(false);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Add Treatment" subtitle={patientName} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Procedure */}
          <Text style={styles.fieldLabel}>Procedure *</Text>
          <TouchableOpacity style={[styles.selector, errors.procedure && styles.selectorError]}
            onPress={() => setShowProcedures((p) => !p)}>
            <Text style={[styles.selectorText, !form.procedure && styles.placeholder]}>
              {form.procedure || 'Select procedure'}
            </Text>
            <Text style={styles.selectorChevron}>{showProcedures ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.procedure && <Text style={styles.errorText}>{errors.procedure}</Text>}
          {showProcedures && (
            <View style={styles.dropdown}>
              {PROCEDURES.map((p) => (
                <TouchableOpacity key={p} style={[styles.dropItem, form.procedure === p && styles.dropItemActive]}
                  onPress={() => { set('procedure', p); setShowProcedures(false); }}>
                  <Text style={[styles.dropText, form.procedure === p && styles.dropTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Dentist */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Dentist *</Text>
          <TouchableOpacity style={[styles.selector, errors.dentist_id && styles.selectorError]}
            onPress={() => setShowDentists((p) => !p)}>
            <Text style={[styles.selectorText, !selectedDentist && styles.placeholder]}>
              {selectedDentist ? `Dr. ${selectedDentist.name}` : 'Select dentist'}
            </Text>
            <Text style={styles.selectorChevron}>{showDentists ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.dentist_id && <Text style={styles.errorText}>{errors.dentist_id}</Text>}
          {showDentists && (
            <View style={styles.dropdown}>
              {dentists.map((d) => (
                <TouchableOpacity key={d.id} style={[styles.dropItem, form.dentist_id === d.id && styles.dropItemActive]}
                  onPress={() => { set('dentist_id', d.id); setShowDentists(false); }}>
                  <Text style={[styles.dropText, form.dentist_id === d.id && styles.dropTextActive]}>
                    Dr. {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Input label="Tooth Number (FDI)" value={form.tooth_number} onChangeText={(v) => set('tooth_number', v)}
            placeholder="e.g. 16, 21, 36" keyboardType="default" />

          <Input label="Diagnosis *" value={form.diagnosis} onChangeText={(v) => set('diagnosis', v)}
            placeholder="e.g. Deep caries with pulp involvement" error={errors.diagnosis} />

          {/* Status */}
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => (
              <TouchableOpacity key={s.value}
                style={[styles.statusBtn, form.status === s.value && styles.statusBtnActive]}
                onPress={() => setForm((p) => ({ ...p, status: s.value }))}>
                <Text style={[styles.statusText, form.status === s.value && styles.statusTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Cost (₹) *" value={form.cost} onChangeText={(v) => set('cost', v)}
            keyboardType="decimal-pad" placeholder="0.00" error={errors.cost} prefix="₹" />

          <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)}
            placeholder="Additional notes..." multiline numberOfLines={3}
            textAlignVertical="top" style={styles.textarea} />

          <Button title="Save Treatment" onPress={handleSave} loading={loading} size="lg" />
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
  selectorText: { fontSize: typography.base, color: colors.text, flex: 1 },
  placeholder: { color: colors.textMuted },
  selectorChevron: { fontSize: 12, color: colors.textMuted },
  dropdown: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden',
  },
  dropItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  dropItemActive: { backgroundColor: colors.primaryLight },
  dropText: { fontSize: typography.base, color: colors.text },
  dropTextActive: { color: colors.primary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statusBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  statusBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  statusText: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '500' },
  statusTextActive: { color: colors.primary, fontWeight: '700' },
  textarea: { minHeight: 80, paddingTop: spacing.sm },
});
