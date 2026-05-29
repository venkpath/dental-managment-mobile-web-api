import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PatientSearchInput from '../../components/PatientSearchInput';
import { membershipsService, type MembershipPlan } from '../../services/memberships.service';
import { patientService } from '../../services/patient.service';
import { useAuthStore } from '../../store/auth.store';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList, PatientStackParamList, Patient } from '../../types';

type Route = RouteProp<PatientStackParamList & BillingStackParamList, 'EnrollMembership'>;
type Nav = NativeStackNavigationProp<PatientStackParamList & BillingStackParamList>;

interface AddedMember {
  patient_id: string;
  name: string;
  relation_label: string;
}

export default function EnrollMembershipScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const params = route.params ?? {};
  const initialPatientId = params.patientId;
  const initialPatientName = params.patientName ?? '';
  const { branchId } = useAuthStore();

  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(
    initialPatientId ? { id: initialPatientId, name: initialPatientName } : null,
  );
  const [patientError, setPatientError] = useState('');

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState<AddedMember[]>([]);

  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    membershipsService.listPlans().then((list) => {
      const active = list.filter((p) => p.is_active !== false);
      setPlans(active);
      if (active.length > 0) {
        setPlanId(active[0].id);
        setAmountPaid(active[0].price?.toString() ?? '');
      }
    });
  }, []);

  const selectedPlan = plans.find((p) => p.id === planId);

  useEffect(() => {
    if (selectedPlan?.price != null && !amountPaid) {
      setAmountPaid(selectedPlan.price.toString());
    }
  }, [selectedPlan, amountPaid]);

  const maxMembers = selectedPlan?.max_members ?? 1;
  const canAddMore = members.length + 1 < maxMembers; // +1 for primary patient

  const handleSubmit = async () => {
    if (!selectedPatient?.id) {
      setPatientError('Select a patient');
      Alert.alert('Patient required', 'Choose the primary member for this enrollment.');
      return;
    }
    setPatientError('');
    if (!planId) {
      Alert.alert('Plan required', 'Pick a membership plan.');
      return;
    }
    if (!branchId) {
      Alert.alert('Error', 'No branch in session.');
      return;
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD for start date.');
      return;
    }

    setSubmitting(true);
    try {
      await membershipsService.createEnrollment({
        membership_plan_id: planId,
        branch_id: branchId,
        primary_patient_id: selectedPatient.id,
        start_date: startDate,
        amount_paid: amountPaid ? Number(amountPaid) : undefined,
        notes: notes.trim() || undefined,
        members: members.map((m) => ({
          patient_id: m.patient_id,
          relation_label: m.relation_label || undefined,
        })),
      });
      Alert.alert('Enrolled', `${selectedPatient.name} is now a member.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Enrollment failed', (err as { message?: string })?.message ?? 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top }}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Enroll in Membership</Text>
            <Text style={s.sub} numberOfLines={1}>
              {selectedPatient?.name || 'Select patient below'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 + bottomInset }}>
        {!initialPatientId && (
          <View style={s.card}>
            <Text style={s.label}>Primary patient *</Text>
            <PatientSearchInput
              selectedPatient={selectedPatient}
              onSelect={(p) => { setSelectedPatient(p.id ? p : null); setPatientError(''); }}
              error={patientError}
            />
          </View>
        )}
        {/* Plan card */}
        <View style={s.card}>
          <Text style={s.label}>Plan *</Text>
          {plans.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTxt}>
                No active membership plans. Create one under More → Memberships → Plans.
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={s.field} onPress={() => setPlanPickerOpen(true)}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldTxt} numberOfLines={1}>
                  {selectedPlan?.name ?? '— Pick a plan —'}
                </Text>
                {selectedPlan && (
                  <Text style={s.fieldSub}>
                    ₹{Number(selectedPlan.price ?? 0).toLocaleString()} ·{' '}
                    {selectedPlan.duration_months ?? 12} mo ·{' '}
                    up to {selectedPlan.max_members ?? 1} member{(selectedPlan.max_members ?? 1) > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {selectedPlan?.benefits && selectedPlan.benefits.length > 0 && (
            <View style={s.benefitsBox}>
              <Text style={s.benefitsTitle}>Includes</Text>
              {selectedPlan.benefits.slice(0, 5).map((b, i) => (
                <View key={i} style={s.benefitRow}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Text style={s.benefitTxt} numberOfLines={1}>{b.title}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Dates + amount */}
        <View style={s.card}>
          <Text style={s.label}>Start Date *</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            style={s.input}
          />

          <Text style={[s.label, { marginTop: 12 }]}>Amount Paid (₹)</Text>
          <TextInput
            value={amountPaid}
            onChangeText={setAmountPaid}
            placeholder="0"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            style={s.input}
          />
        </View>

        {/* Additional members */}
        {(selectedPlan?.max_members ?? 1) > 1 && (
          <View style={s.card}>
            <View style={s.rowHead}>
              <Text style={s.label}>
                Additional Members ({members.length} / {(selectedPlan?.max_members ?? 1) - 1})
              </Text>
              {canAddMore && (
                <TouchableOpacity onPress={() => setMemberPickerOpen(true)}>
                  <Text style={s.addLink}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {members.length === 0 ? (
              <Text style={s.helperTxt}>
                Add family members covered under this plan.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {members.map((m, i) => (
                  <View key={m.patient_id} style={s.memberRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName} numberOfLines={1}>{m.name}</Text>
                      <TextInput
                        value={m.relation_label}
                        onChangeText={(v) => {
                          setMembers((prev) => prev.map((x, idx) => idx === i ? { ...x, relation_label: v } : x));
                        }}
                        placeholder="Relation (e.g. Spouse)"
                        placeholderTextColor="#94a3b8"
                        style={s.relationInput}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
                      style={s.delBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        <View style={s.card}>
          <Text style={s.label}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything to note about this enrollment"
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
          />
        </View>
      </ScrollView>

      <View style={[s.actionBar, { paddingBottom: 12 + bottomInset }]}>
        <TouchableOpacity
          style={[s.saveBtn, (!planId || submitting) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={!planId || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="card" size={15} color="#fff" />
              <Text style={s.saveTxt}>Enroll Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Plan picker */}
      <Modal visible={planPickerOpen} transparent animationType="fade" onRequestClose={() => setPlanPickerOpen(false)}>
        <Pressable style={ps.backdrop} onPress={() => setPlanPickerOpen(false)}>
          <Pressable style={ps.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={ps.head}>
              <Text style={ps.title}>Select Plan</Text>
              <TouchableOpacity onPress={() => setPlanPickerOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 460 }}>
              {plans.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[ps.planItem, planId === p.id && ps.itemActive]}
                  onPress={() => {
                    setPlanId(p.id);
                    setAmountPaid(p.price?.toString() ?? '');
                    setMembers([]);
                    setPlanPickerOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={ps.planName}>{p.name}</Text>
                    <Text style={ps.planMeta}>
                      ₹{Number(p.price ?? 0).toLocaleString()} · {p.duration_months ?? 12} mo · up to {p.max_members ?? 1}
                    </Text>
                  </View>
                  {planId === p.id && <Ionicons name="checkmark-circle" size={18} color="#4361EE" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Member picker */}
      <MemberPickerModal
        visible={memberPickerOpen}
        onClose={() => setMemberPickerOpen(false)}
        excludeIds={[selectedPatient?.id ?? '', ...members.map((m) => m.patient_id)].filter(Boolean)}
        onPick={(p) => {
          setMembers((prev) => [...prev, {
            patient_id: p.id,
            name: `${p.first_name} ${p.last_name}`,
            relation_label: '',
          }]);
          setMemberPickerOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function MemberPickerModal({
  visible, onClose, excludeIds, onPick,
}: {
  visible: boolean;
  onClose: () => void;
  excludeIds: string[];
  onPick: (p: Patient) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setLoading(true);
      patientService.list(1, query, 20)
        .then((r) => setResults(r.data ?? []))
        .finally(() => setLoading(false));
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [visible, query]);

  const filtered = useMemo(
    () => results.filter((p) => !excludeIds.includes(p.id)),
    [results, excludeIds],
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ps.backdrop} onPress={onClose}>
        <Pressable style={ps.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={ps.head}>
            <Text style={ps.title}>Add Member</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <View style={ps.searchBox}>
              <Ionicons name="search" size={14} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search patients"
                placeholderTextColor="#94a3b8"
                style={{ flex: 1, fontSize: 14, color: '#0f172a', padding: 0 }}
              />
            </View>
          </View>
          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#4361EE" />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {filtered.length === 0 ? (
                <Text style={{ padding: 20, color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
                  No patients found.
                </Text>
              ) : (
                filtered.map((p) => (
                  <TouchableOpacity key={p.id} style={ps.patientRow} onPress={() => onPick(p)}>
                    <View style={ps.avatar}>
                      <Text style={ps.avatarTxt}>
                        {(p.first_name?.[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ps.patientName}>{p.first_name} {p.last_name}</Text>
                      <Text style={ps.patientPhone}>{p.phone}</Text>
                    </View>
                    <Ionicons name="add-circle" size={20} color="#4361EE" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 11, color: '#64748b', marginTop: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  fieldTxt: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  fieldSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a',
  },
  helperTxt: { fontSize: 11, color: '#94a3b8' },
  emptyBox: {
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  emptyTxt: { fontSize: 12, color: '#92400E', lineHeight: 17 },

  benefitsBox: { marginTop: 10, gap: 5 },
  benefitsTitle: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitTxt: { fontSize: 12, color: '#0f172a' },

  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addLink: { fontSize: 13, fontWeight: '700', color: '#4361EE' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  memberName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  relationInput: {
    marginTop: 4, fontSize: 12, color: '#0f172a',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 2,
  },
  delBtn: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },

  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingHorizontal: 16, paddingTop: 12,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4361EE', paddingVertical: 14, borderRadius: 12,
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  itemActive: { backgroundColor: '#EEF2FF' },
  planItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  planName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  planMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
  },
  patientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: '#4361EE' },
  patientName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  patientPhone: { fontSize: 11, color: '#64748b', marginTop: 1 },
});
