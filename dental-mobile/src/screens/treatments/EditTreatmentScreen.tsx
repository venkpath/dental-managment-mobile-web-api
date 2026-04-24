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
import { getCurrencySymbol } from '../../utils/format';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import Badge from '../../components/Badge';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Treatment, PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'EditTreatment'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const STATUSES = [
  { value: 'PLANNED', label: '📋 Planned', color: colors.purple },
  { value: 'IN_PROGRESS', label: '⚙️ In Progress', color: colors.warning },
  { value: 'COMPLETED', label: '✅ Completed', color: colors.success },
] as const;

type Status = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

export default function EditTreatmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { treatmentId } = route.params;
  const bottomInset = useBottomInset();

  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tooth_number: '', diagnosis: '', procedure: '',
    status: 'PLANNED' as Status, cost: '', notes: '',
  });

  useFocusEffect(useCallback(() => {
    treatmentService.get(treatmentId).then((t) => {
      setTreatment(t);
      setForm({
        tooth_number: t.tooth_number ?? '',
        diagnosis: t.diagnosis,
        procedure: t.procedure,
        status: t.status as Status,
        cost: String(t.cost),
        notes: t.notes ?? '',
      });
    }).finally(() => setFetching(false));
  }, [treatmentId]));

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.diagnosis.trim()) { Alert.alert('Error', 'Diagnosis is required'); return; }
    setLoading(true);
    try {
      await treatmentService.update(treatmentId, {
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

  if (fetching || !treatment) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Edit Treatment" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Edit Treatment"
        subtitle={`${treatment.patient.first_name} ${treatment.patient.last_name}`}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Current status banner */}
          <View style={styles.currentBanner}>
            <View>
              <Text style={styles.bannerProcedure}>{treatment.procedure}</Text>
              <Text style={styles.bannerDentist}>Dr. {treatment.dentist.name}</Text>
            </View>
            <Badge label={treatment.status} variant={treatment.status as any} />
          </View>

          {/* Status update — most common action, show first */}
          <Text style={styles.sectionLabel}>Update Status</Text>
          <View style={styles.statusGrid}>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.statusCard, form.status === s.value && { borderColor: s.color, backgroundColor: s.color + '15' }]}
                onPress={() => setForm((p) => ({ ...p, status: s.value }))}
              >
                <Text style={styles.statusEmoji}>{s.label.split(' ')[0]}</Text>
                <Text style={[styles.statusLabel, form.status === s.value && { color: s.color, fontWeight: '700' }]}>
                  {s.label.split(' ').slice(1).join(' ')}
                </Text>
                {form.status === s.value && (
                  <View style={[styles.statusCheck, { backgroundColor: s.color }]}>
                    <Text style={styles.statusCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Treatment Details</Text>
          <Input label="Diagnosis" value={form.diagnosis} onChangeText={(v) => set('diagnosis', v)}
            placeholder="Diagnosis description" />
          <Input label="Tooth Number (FDI)" value={form.tooth_number} onChangeText={(v) => set('tooth_number', v)}
            placeholder="e.g. 16, 21, 36" />
          <Input label={`Cost (${getCurrencySymbol()})`} value={form.cost} onChangeText={(v) => set('cost', v)}
            keyboardType="decimal-pad" prefix={getCurrencySymbol()} />
          <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)}
            placeholder="Additional notes..." multiline numberOfLines={3}
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
  currentBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.lg, ...shadow.sm,
  },
  bannerProcedure: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  bannerDentist: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  sectionLabel: {
    fontSize: typography.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.md,
  },
  statusGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statusCard: {
    flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
    gap: spacing.xs, position: 'relative',
  },
  statusEmoji: { fontSize: 22 },
  statusLabel: { fontSize: typography.xs, color: colors.textSecondary, textAlign: 'center' },
  statusCheck: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  statusCheckText: { fontSize: 11, color: colors.white, fontWeight: '700' },
  textarea: { minHeight: 80, paddingTop: spacing.sm },
});
