import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'EditPatient'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
type Gender = typeof GENDERS[number];

export default function EditPatientScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId } = route.params;
  const bottomInset = useBottomInset();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    gender: '' as Gender | '', date_of_birth: '', blood_group: '', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => {
    patientService.get(patientId).then((p) => {
      setForm({
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        email: p.email ?? '',
        gender: (p.gender as Gender) ?? '',
        date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
        blood_group: p.blood_group ?? '',
        notes: p.notes ?? '',
      });
    }).finally(() => setFetching(false));
  }, [patientId]));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter valid 10-digit number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.gender) payload.gender = form.gender;
      if (form.date_of_birth.trim()) payload.date_of_birth = form.date_of_birth.trim();
      if (form.blood_group.trim()) payload.blood_group = form.blood_group.trim();
      payload.notes = form.notes.trim();

      await patientService.update(patientId, payload as any);
      Alert.alert('Saved', 'Patient details updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Edit Patient" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Edit Patient" onBack={() => navigation.goBack()} />
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
              error={errors.first_name} containerStyle={styles.half} />
            <Input label="Last Name *" value={form.last_name} onChangeText={(v) => set('last_name', v)}
              error={errors.last_name} containerStyle={styles.half} />
          </View>
          <Input label="Mobile Number *" value={form.phone} onChangeText={(v) => set('phone', v)}
            keyboardType="phone-pad" maxLength={10} error={errors.phone} />
          <Input label="Email" value={form.email} onChangeText={(v) => set('email', v)}
            keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.sectionLabel}>Additional Details</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity key={g} style={[styles.pill, form.gender === g && styles.pillActive]}
                  onPress={() => set('gender', form.gender === g ? '' : g)}>
                  <Text style={[styles.pillText, form.gender === g && styles.pillTextActive]}>
                    {g === 'MALE' ? '♂ Male' : g === 'FEMALE' ? '♀ Female' : '⚥ Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Input label="Date of Birth (YYYY-MM-DD)" value={form.date_of_birth}
            onChangeText={(v) => set('date_of_birth', v)} placeholder="1990-01-15" />
          <Input label="Blood Group" value={form.blood_group}
            onChangeText={(v) => set('blood_group', v.toUpperCase())} placeholder="A+, B-, O+..."
            autoCapitalize="characters" maxLength={4} />
          <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)}
            placeholder="Medical history, allergies..." multiline numberOfLines={3}
            textAlignVertical="top" style={styles.textarea} />

          <Button title="Save Changes" onPress={handleSave} loading={loading} size="lg" />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary },
  sectionLabel: {
    fontSize: typography.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.md, marginTop: spacing.sm,
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pillText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.primary },
  textarea: { minHeight: 80, paddingTop: spacing.sm },
});
