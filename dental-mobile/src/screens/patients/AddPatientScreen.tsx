import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
type Gender = typeof GENDERS[number];

export default function AddPatientScreen() {
  const navigation = useNavigation<Nav>();
  const { branchId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const bottomInset = useBottomInset();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    gender: '' as Gender | '',
    date_of_birth: '',
    blood_group: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter valid 10-digit Indian mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!branchId) {
      Alert.alert('Error', 'No branch assigned. Please contact admin.');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        branch_id: branchId,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.gender) payload.gender = form.gender;
      if (form.date_of_birth.trim()) payload.date_of_birth = form.date_of_birth.trim();
      if (form.blood_group.trim()) payload.blood_group = form.blood_group.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();

      await patientService.create(payload as Parameters<typeof patientService.create>[0]);
      Alert.alert('Success', 'Patient added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add patient';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Add Patient" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Basic Information</Text>
          <View style={styles.row2}>
            <Input
              label="First Name *"
              value={form.first_name}
              onChangeText={(v) => set('first_name', v)}
              placeholder="Riya"
              error={errors.first_name}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Last Name *"
              value={form.last_name}
              onChangeText={(v) => set('last_name', v)}
              placeholder="Sharma"
              error={errors.last_name}
              containerStyle={styles.halfInput}
            />
          </View>

          <Input
            label="Mobile Number *"
            value={form.phone}
            onChangeText={(v) => set('phone', v)}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
          />

          <Input
            label="Email (optional)"
            value={form.email}
            onChangeText={(v) => set('email', v)}
            placeholder="patient@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.sectionLabel}>Additional Details</Text>

          {/* Gender picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderOption, form.gender === g && styles.genderSelected]}
                  onPress={() => set('gender', form.gender === g ? '' : g)}
                >
                  <Text style={[styles.genderText, form.gender === g && styles.genderTextSelected]}>
                    {g === 'MALE' ? '♂ Male' : g === 'FEMALE' ? '♀ Female' : '⚥ Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Date of Birth (YYYY-MM-DD)"
            value={form.date_of_birth}
            onChangeText={(v) => set('date_of_birth', v)}
            placeholder="1990-01-15"
            keyboardType="numbers-and-punctuation"
          />

          <Input
            label="Blood Group"
            value={form.blood_group}
            onChangeText={(v) => set('blood_group', v.toUpperCase())}
            placeholder="A+, B-, O+..."
            autoCapitalize="characters"
            maxLength={4}
          />

          <Input
            label="Notes"
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder="Any medical history or allergies..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.textarea}
          />

          <Button
            title="Save Patient"
            onPress={handleSave}
            loading={loading}
            size="lg"
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: typography.sm, fontWeight: '500', color: colors.text, marginBottom: spacing.xs },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  genderText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  genderTextSelected: { color: colors.primary },
  textarea: { minHeight: 80, paddingTop: spacing.sm },
  saveBtn: { marginTop: spacing.md },
});
