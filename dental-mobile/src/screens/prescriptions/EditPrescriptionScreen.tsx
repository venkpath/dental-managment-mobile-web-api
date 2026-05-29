import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { prescriptionService } from '../../services/prescription.service';
import { toApiPrescriptionItems, medName } from '../../utils/prescriptionForm';
import { userService, type StaffUser } from '../../services/user.service';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList, PatientStackParamList, PrescriptionMedicine } from '../../types';

type BillingRoute = RouteProp<BillingStackParamList, 'EditPrescription'>;
type PatientRoute = RouteProp<PatientStackParamList, 'EditPrescription'>;
type Nav = NativeStackNavigationProp<BillingStackParamList & PatientStackParamList>;

const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'As needed (PRN)', 'Before meals', 'After meals', 'At bedtime', 'On empty stomach',
];
const DURATION_OPTIONS = [
  '1 day', '3 days', '5 days', '7 days', '10 days', '14 days',
  '21 days', '1 month', '2 months', '3 months', '6 months', 'Until finished',
];
const ROUTE_OPTIONS = ['Oral', 'Topical', 'Sublingual', 'Inhalation', 'IM', 'IV'];

interface MedItem {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  purpose: string;
  notes: string;
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

function blankItem(): MedItem {
  return {
    drug_name: '', dosage: '', frequency: '', duration: '',
    route: '', purpose: '', notes: '',
    morning: '', afternoon: '', evening: '', night: '',
  };
}

function fromApiItem(m: PrescriptionMedicine): MedItem {
  return {
    drug_name: m.medicine_name ?? '',
    dosage: m.dosage ?? '',
    frequency: m.frequency ?? '',
    duration: m.duration ?? '',
    route: m.route ?? '',
    purpose: m.purpose ?? '',
    notes: m.notes ?? '',
    morning: m.morning != null ? String(m.morning) : '',
    afternoon: m.afternoon != null ? String(m.afternoon) : '',
    evening: m.evening != null ? String(m.evening) : '',
    night: m.night != null ? String(m.night) : '',
  };
}

function PickerModal({ visible, title, options, value, onSelect, onClose }: {
  visible: boolean; title: string; options: string[];
  value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pm.backdrop} onPress={onClose}>
        <Pressable style={pm.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={pm.header}>
            <Text style={pm.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color="#64748b" /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[pm.item, value === opt && pm.itemActive]}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={[pm.itemTxt, value === opt && pm.itemTxtActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function EditPrescriptionScreen() {
  const route = useRoute<BillingRoute | PatientRoute>();
  const navigation = useNavigation<Nav>();
  const { prescriptionId } = route.params;
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();

  const [patientName, setPatientName] = useState('');
  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [dentistId, setDentistId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<MedItem[]>([blankItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [booting, setBooting] = useState(true);

  const [dentistPickerOpen, setDentistPickerOpen] = useState(false);
  const [activeFreqIdx, setActiveFreqIdx] = useState<number | null>(null);
  const [activeDurIdx, setActiveDurIdx] = useState<number | null>(null);
  const [activeRouteIdx, setActiveRouteIdx] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    setBooting(true);
    prescriptionService.getDetail(prescriptionId)
      .then((rx) => {
        if (!rx) throw new Error('Not found');
        const p = rx.patient;
        setPatientName(p ? `${p.first_name} ${p.last_name}`.trim() : '');
        setDentistId(rx.dentist?.id ?? '');
        setDiagnosis(rx.diagnosis ?? '');
        setInstructions(rx.instructions ?? '');
        const meds = rx.items?.length ? rx.items.map(fromApiItem) : [];
        setItems(meds);
      })
      .catch(() => Alert.alert('Error', 'Could not load prescription'))
      .finally(() => setBooting(false));
  }, [prescriptionId]));

  useEffect(() => {
    userService.listStaff()
      .then((staff) => {
        const onlyDentists = staff.filter((u) => /dentist|consultant/i.test(u.role));
        setDentists(onlyDentists.length > 0 ? onlyDentists : staff);
      })
      .catch(() => {});
  }, []);

  const updateItem = useCallback(<K extends keyof MedItem>(idx: number, key: K, value: MedItem[K]) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }, []);

  const dentistName = dentists.find((d) => d.id === dentistId)?.name ?? 'Select dentist';

  const handleSubmit = async () => {
    if (!dentistId) return Alert.alert('Required', 'Select a dentist.');
    const cleanItems = items.filter((it) => medName(it).length > 0);
    for (const it of cleanItems) {
      const name = medName(it);
      if (!it.dosage.trim()) return Alert.alert('Dosage', `Dosage required for ${name}`);
      if (!it.frequency) return Alert.alert('Frequency', `Frequency required for ${name}`);
      if (!it.duration) return Alert.alert('Duration', `Duration required for ${name}`);
    }

    setSubmitting(true);
    try {
      await prescriptionService.update(prescriptionId, {
        dentist_id: dentistId,
        diagnosis: diagnosis.trim() || undefined,
        instructions: instructions.trim() || undefined,
        items: toApiPrescriptionItems(cleanItems),
      });

      Alert.alert('Saved', 'Prescription updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Error', (err as { message?: string })?.message ?? 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (booting) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Edit prescription</Text>
        </View>
        <ActivityIndicator style={{ marginTop: 40 }} color="#4361EE" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top }}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.topTitle}>Edit prescription</Text>
            {patientName ? <Text style={s.topSub} numberOfLines={1}>{patientName}</Text> : null}
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + bottomInset, gap: 12 }}
      >
        <TouchableOpacity style={s.select} onPress={() => setDentistPickerOpen(true)}>
          <Text style={s.selectLabel}>Dentist</Text>
          <Text style={s.selectValue}>{dentistName}</Text>
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        </TouchableOpacity>

        <TextInput style={s.input} placeholder="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} multiline />
        <TextInput style={s.input} placeholder="Instructions to patient" value={instructions} onChangeText={setInstructions} multiline />

        {items.length === 0 ? (
          <Text style={s.hint}>No medicines — tap Add medicine or save with instructions only.</Text>
        ) : null}

        {items.map((it, idx) => (
          <View key={idx} style={s.medCard}>
            <View style={s.medHead}>
              <Text style={s.medTitle}>Medicine {idx + 1}</Text>
              <TouchableOpacity onPress={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
            <TextInput style={s.input} placeholder="Medicine name *" value={it.drug_name} onChangeText={(v) => updateItem(idx, 'drug_name', v)} />
            <Text style={s.schedLabel}>Dosage schedule (per time)</Text>
            <View style={s.schedRow}>
              {(['morning', 'afternoon', 'evening', 'night'] as const).map((slot) => (
                <View key={slot} style={s.schedCell}>
                  <Text style={s.schedCap}>{slot.slice(0, 4)}</Text>
                  <TextInput
                    style={s.schedInput}
                    value={String(it[slot] ?? '')}
                    onChangeText={(v) => updateItem(idx, slot, v.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                  />
                </View>
              ))}
            </View>
            <TextInput style={s.input} placeholder="Dosage *" value={it.dosage} onChangeText={(v) => updateItem(idx, 'dosage', v)} />
            <TouchableOpacity style={s.select} onPress={() => setActiveFreqIdx(idx)}>
              <Text style={s.selectLabel}>Frequency *</Text>
              <Text style={s.selectValue}>{it.frequency || 'Select'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.select} onPress={() => setActiveDurIdx(idx)}>
              <Text style={s.selectLabel}>Duration *</Text>
              <Text style={s.selectValue}>{it.duration || 'Select'}</Text>
            </TouchableOpacity>
            <TextInput style={s.input} placeholder="Notes" value={it.notes} onChangeText={(v) => updateItem(idx, 'notes', v)} />
          </View>
        ))}

        <TouchableOpacity style={s.addMed} onPress={() => setItems((p) => [...p, blankItem()])}>
          <Ionicons name="add-circle-outline" size={20} color="#4361EE" />
          <Text style={s.addMedTxt}>Add medicine</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.saveBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save prescription</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={dentistPickerOpen} transparent animationType="fade" onRequestClose={() => setDentistPickerOpen(false)}>
        <Pressable style={pm.backdrop} onPress={() => setDentistPickerOpen(false)}>
          <Pressable style={pm.sheet}>
            <ScrollView>
              {dentists.map((d) => (
                <TouchableOpacity key={d.id} style={pm.item} onPress={() => { setDentistId(d.id); setDentistPickerOpen(false); }}>
                  <Text style={pm.itemTxt}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PickerModal visible={activeFreqIdx !== null} title="Frequency" options={FREQUENCY_OPTIONS} value={activeFreqIdx !== null ? items[activeFreqIdx]?.frequency ?? '' : ''} onSelect={(v) => { if (activeFreqIdx !== null) updateItem(activeFreqIdx, 'frequency', v); }} onClose={() => setActiveFreqIdx(null)} />
      <PickerModal visible={activeDurIdx !== null} title="Duration" options={DURATION_OPTIONS} value={activeDurIdx !== null ? items[activeDurIdx]?.duration ?? '' : ''} onSelect={(v) => { if (activeDurIdx !== null) updateItem(activeDurIdx, 'duration', v); }} onClose={() => setActiveDurIdx(null)} />
      <PickerModal visible={activeRouteIdx !== null} title="Route" options={ROUTE_OPTIONS} value={activeRouteIdx !== null ? items[activeRouteIdx]?.route ?? '' : ''} onSelect={(v) => { if (activeRouteIdx !== null) updateItem(activeRouteIdx, 'route', v); }} onClose={() => setActiveRouteIdx(null)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  topSub: { fontSize: 12, color: '#64748b' },
  select: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectLabel: { fontSize: 11, color: '#94a3b8', width: 72 },
  selectValue: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 14, color: '#0f172a', minHeight: 44 },
  medCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  medHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medTitle: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  addMed: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 12 },
  addMedTxt: { color: '#4361EE', fontWeight: '700' },
  saveBtn: { backgroundColor: '#4361EE', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { fontSize: 13, color: '#64748b', fontStyle: 'italic', textAlign: 'center' },
  schedLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  schedRow: { flexDirection: 'row', gap: 8 },
  schedCell: { flex: 1, alignItems: 'center' },
  schedCap: { fontSize: 10, color: '#94a3b8', marginBottom: 4 },
  schedInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, width: '100%', textAlign: 'center', padding: 8, fontSize: 14 },
});

const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '60%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemActive: { backgroundColor: '#EEF2FF' },
  itemTxt: { fontSize: 15, color: '#334155' },
  itemTxtActive: { color: '#4361EE', fontWeight: '700' },
});
