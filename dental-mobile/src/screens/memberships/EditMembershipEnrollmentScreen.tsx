import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { membershipsService } from '../../services/memberships.service';
import DatePickerInput from '../../components/DatePickerInput';
import SelectSheet from '../../components/SelectSheet';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'EditMembershipEnrollment'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8', border: '#E2E8F0',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function EditMembershipEnrollmentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { enrollmentId } = route.params;

  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);
  const [form, setForm] = useState({
    status: 'active',
    start_date: '',
    end_date: '',
    amount_paid: '',
    notes: '',
  });
  const [label, setLabel] = useState('');

  useFocusEffect(useCallback(() => {
    membershipsService.getEnrollment(enrollmentId).then((e) => {
      if (!e) return;
      const p = e.primary_patient;
      setLabel(p ? `${p.first_name} ${p.last_name}` : 'Enrollment');
      setForm({
        status: e.status ?? 'active',
        start_date: e.start_date?.split('T')[0] ?? '',
        end_date: e.end_date?.split('T')[0] ?? '',
        amount_paid: e.amount_paid != null ? String(e.amount_paid) : '',
        notes: e.notes ?? '',
      });
    }).finally(() => setBooting(false));
  }, [enrollmentId]));

  const handleSave = async () => {
    setLoading(true);
    try {
      await membershipsService.updateEnrollment(enrollmentId, {
        status: form.status as 'active' | 'expired' | 'cancelled' | 'paused',
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        amount_paid: form.amount_paid ? Number(form.amount_paid) : undefined,
        notes: form.notes.trim() || undefined,
      });
      Alert.alert('Saved', 'Enrollment updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <View style={[ui.screen, { paddingTop: insets.top }]}>
        <View style={ui.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top, backgroundColor: C.bg }}>
        <View style={ui.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ui.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ui.topTitle}>Edit enrollment</Text>
            <Text style={ui.topSub} numberOfLines={1}>{label}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + bottomInset, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={ui.card}>
          <Text style={ui.hint}>Plan and primary patient cannot be changed here (web parity). Update status, dates, payment, and notes.</Text>
          <Text style={ui.fieldLabel}>Status</Text>
          <TouchableOpacity style={ui.field} onPress={() => setStatusSheet(true)} activeOpacity={0.7}>
            <Text style={ui.fieldTxt}>{STATUS_OPTIONS.find((o) => o.value === form.status)?.label ?? form.status}</Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>
          <DatePickerInput label="Start date" value={form.start_date} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} />
          <DatePickerInput label="End date" value={form.end_date} onChange={(v) => setForm((f) => ({ ...f, end_date: v }))} />
          <Text style={ui.fieldLabel}>Amount paid</Text>
          <TextInput
            value={form.amount_paid}
            onChangeText={(v) => setForm((f) => ({ ...f, amount_paid: v }))}
            keyboardType="decimal-pad"
            style={ui.input}
            placeholder="0"
            placeholderTextColor={C.textMuted}
          />
          <Text style={ui.fieldLabel}>Notes</Text>
          <TextInput
            value={form.notes}
            onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            multiline
            style={[ui.input, { minHeight: 72, textAlignVertical: 'top' }]}
            placeholderTextColor={C.textMuted}
          />
        </View>
      </ScrollView>

      <View style={[ui.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity style={[ui.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryTxt}>Save changes</Text>}
        </TouchableOpacity>
      </View>

      <SelectSheet
        visible={statusSheet}
        title="Status"
        options={STATUS_OPTIONS}
        selectedValue={form.status}
        onSelect={(v) => setForm((f) => ({ ...f, status: v }))}
        onClose={() => setStatusSheet(false)}
      />
    </KeyboardAvoidingView>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  topTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  topSub: { fontSize: 12, color: C.textSub },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 4 },
  hint: { fontSize: 13, color: C.textSub, lineHeight: 18, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 6, marginTop: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center', minHeight: 48,
    borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: C.bg,
  },
  fieldTxt: { flex: 1, fontSize: 15, color: C.text },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text, backgroundColor: C.bg,
  },
  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  primaryBtn: { backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
