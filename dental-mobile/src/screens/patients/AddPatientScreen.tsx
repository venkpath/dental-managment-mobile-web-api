import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import DatePickerInput from '../../components/DatePickerInput';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

// Backend enum values (title case)
const GENDERS = [
  { value: 'Male', label: '♂ Male' },
  { value: 'Female', label: '♀ Female' },
  { value: 'Other', label: '⚥ Other' },
] as const;

type Gender = 'Male' | 'Female' | 'Other';

export default function AddPatientScreen() {
  const navigation = useNavigation<Nav>();
  const { branchId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const bottomInset = useBottomInset();
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    gender: '' as Gender | '',
    date_of_birth: '',
    age: '',
    blood_group: '', allergies: '', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter valid 10-digit mobile number';
    if (!form.gender) e.gender = 'Please select a gender';
    if (!form.date_of_birth && !form.age) e.age = 'Enter DOB or age';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!branchId) { Alert.alert('Error', 'No branch assigned'); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        branch_id: branchId,
        gender: form.gender,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
      if (form.age.trim() && !form.date_of_birth) payload.age = parseInt(form.age.trim(), 10);
      if (form.blood_group.trim()) payload.blood_group = form.blood_group.trim();
      if (form.allergies.trim()) payload.allergies = form.allergies.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();

      await patientService.create(payload as Parameters<typeof patientService.create>[0]);
      Alert.alert('Success', 'Patient added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Add Patient" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Basic Information</Text>
          <View style={styles.row2}>
            <Input label="First Name *" value={form.first_name} onChangeText={(v) => set('first_name', v)}
              placeholder="Riya" error={errors.first_name} containerStyle={styles.half} />
            <Input label="Last Name *" value={form.last_name} onChangeText={(v) => set('last_name', v)}
              placeholder="Sharma" error={errors.last_name} containerStyle={styles.half} />
          </View>
          <Input label="Mobile Number *" value={form.phone} onChangeText={(v) => set('phone', v)}
            placeholder="9876543210" keyboardType="phone-pad" maxLength={10} error={errors.phone} />
          <Input label="Email (optional)" value={form.email} onChangeText={(v) => set('email', v)}
            placeholder="patient@email.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.sectionLabel}>Patient Details</Text>

          {/* Gender — required */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Gender *</Text>
            <View style={styles.pillRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity key={g.value}
                  style={[styles.pill, form.gender === g.value && styles.pillActive]}
                  onPress={() => set('gender', form.gender === g.value ? '' : g.value)}
                >
                  <Text style={[styles.pillText, form.gender === g.value && styles.pillTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
          </View>

          {/* Date of Birth with picker — shows age inline */}
          <DatePickerInput
            label="Date of Birth"
            value={form.date_of_birth}
            onChange={(v) => { set('date_of_birth', v); set('age', ''); }}
          />

          {/* Age — only if DOB not set */}
          {!form.date_of_birth && (
            <Input label="Age (if DOB unknown)" value={form.age} onChangeText={(v) => set('age', v)}
              placeholder="e.g. 35" keyboardType="number-pad" maxLength={3}
              error={errors.age} />
          )}

          <Input label="Blood Group" value={form.blood_group}
            onChangeText={(v) => set('blood_group', v.toUpperCase())}
            placeholder="A+, B-, O+..." autoCapitalize="characters" maxLength={4} />

          <Input label="Allergies" value={form.allergies} onChangeText={(v) => set('allergies', v)}
            placeholder="e.g. Penicillin, Latex" />

          <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)}
            placeholder="Medical history, special instructions..."
            multiline numberOfLines={3} textAlignVertical="top" style={styles.textarea} />

          <Button title="Save Patient" onPress={handleSave} loading={loading} size="lg" />
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
  sectionLabel: {
    fontSize: typography.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.md, marginTop: spacing.sm,
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  pillRow: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pillText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.primary, fontWeight: '700' },
  errorText: { fontSize: typography.xs, color: colors.danger, marginTop: spacing.xs, fontWeight: '500' },
  textarea: { minHeight: 80, paddingTop: spacing.sm },
});
