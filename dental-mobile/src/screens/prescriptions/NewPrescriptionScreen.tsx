import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { prescriptionService } from '../../services/prescription.service';
import { toApiPrescriptionItems, medName, type PrescriptionMedFormItem } from '../../utils/prescriptionForm';
import { userService, type StaffUser } from '../../services/user.service';
import { patientService } from '../../services/patient.service';
import { useAuthStore } from '../../store/auth.store';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList, Patient } from '../../types';

type Route = RouteProp<PatientStackParamList, 'NewPrescription'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

// ─── Web-parity option lists ─────────────────────────────────────────────────
const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'As needed (PRN)', 'Before meals', 'After meals',
  'At bedtime', 'On empty stomach',
];

const DURATION_OPTIONS = [
  '1 day', '3 days', '5 days', '7 days', '10 days', '14 days',
  '21 days', '1 month', '2 months', '3 months', '6 months', 'Until finished',
];

const ROUTE_OPTIONS = ['Oral', 'Topical', 'Sublingual', 'Inhalation', 'IM', 'IV'];

// ─── Form item shape (UI-side) ───────────────────────────────────────────────
interface MedItem extends PrescriptionMedFormItem {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  purpose: string;
  notes: string;
  warnings: string;
  morning: string;   // numeric strings — converted to numbers on submit
  afternoon: string;
  evening: string;
  night: string;
}

function blankItem(): MedItem {
  return {
    drug_name: '', dosage: '', frequency: '', duration: '',
    route: '', purpose: '', notes: '', warnings: '',
    morning: '', afternoon: '', evening: '', night: '',
  };
}

// ─── Reusable Picker Modal ───────────────────────────────────────────────────
function PickerModal({
  visible, title, options, value, onSelect, onClose,
}: {
  visible: boolean; title: string; options: string[];
  value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.modalItem, value === opt && s.modalItemActive]}
                onPress={() => { onSelect(opt); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[s.modalItemTxt, value === opt && s.modalItemTxtActive]}>{opt}</Text>
                {value === opt && <Ionicons name="checkmark" size={16} color="#4361EE" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function NewPrescriptionScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId, patientName, prefillDiagnosis, prefillMedications } = route.params;
  const { user, branchId } = useAuthStore();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [dentistId, setDentistId] = useState<string>(user?.id ?? '');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [pastDentalHistory, setPastDentalHistory] = useState('');
  const [allergiesMedical, setAllergiesMedical] = useState('');
  const [diagnosis, setDiagnosis] = useState(prefillDiagnosis ?? '');
  const [instructions, setInstructions] = useState('');
  const [interactions, setInteractions] = useState('');
  const [dietaryAdvice, setDietaryAdvice] = useState('');
  const [postProcedure, setPostProcedure] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [items, setItems] = useState<MedItem[]>(() => {
    if (prefillMedications && prefillMedications.length > 0) {
      return prefillMedications.map((m) => ({
        ...blankItem(),
        drug_name: m.drug_name ?? '',
        dosage: m.dosage ?? '',
        frequency: m.frequency ?? '',
        duration: m.duration ?? '',
        route: m.route ?? '',
        purpose: m.purpose ?? '',
        notes: m.instructions ?? '',
      }));
    }
    return [blankItem()];
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSafety, setShowSafety] = useState(false);

  // pickers
  const [dentistPickerOpen, setDentistPickerOpen] = useState(false);
  const [activeFreqIdx, setActiveFreqIdx] = useState<number | null>(null);
  const [activeDurIdx, setActiveDurIdx] = useState<number | null>(null);
  const [activeRouteIdx, setActiveRouteIdx] = useState<number | null>(null);

  // Load patient + dentists
  useEffect(() => {
    patientService.get(patientId).then(setPatient).catch(() => {});
    userService.listStaff()
      .then((staff) => {
        // Filter to dentists/consultants (the listStaff fn already includes them + admins)
        const onlyDentists = staff.filter((u) => /dentist|consultant/i.test(u.role));
        setDentists(onlyDentists.length > 0 ? onlyDentists : staff);
      })
      .catch(() => {});
  }, [patientId]);

  // Helpers to mutate item
  const updateItem = useCallback(<K extends keyof MedItem>(idx: number, key: K, value: MedItem[K]) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }, []);

  const addItem = () => setItems((prev) => [...prev, blankItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const dentistName = dentists.find((d) => d.id === dentistId)?.name ?? '— Select dentist —';

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validation
    if (!dentistId) return Alert.alert('Required field', 'Please select a dentist.');
    if (!branchId)  return Alert.alert('Branch missing', 'No branch is set on your session. Re-login and try again.');
    const cleanItems = items.filter((it) => medName(it).length > 0);
    for (const it of cleanItems) {
      const name = medName(it);
      if (!it.dosage.trim()) return Alert.alert('Dosage required', `Please fill dosage for ${name}.`);
      if (!it.frequency) return Alert.alert('Frequency required', `Please pick frequency for ${name}.`);
      if (!it.duration) return Alert.alert('Duration required', `Please pick duration for ${name}.`);
    }

    setSubmitting(true);
    try {
      await prescriptionService.create({
        patient_id: patientId,
        dentist_id: dentistId,
        branch_id: branchId,
        diagnosis: diagnosis.trim() || undefined,
        instructions: instructions.trim() || undefined,
        chief_complaint: chiefComplaint.trim() || undefined,
        past_dental_history: pastDentalHistory.trim() || undefined,
        allergies_medical_history: allergiesMedical.trim() || undefined,
        interactions: interactions.trim() || undefined,
        dietary_advice: dietaryAdvice.trim() || undefined,
        post_procedure_instructions: postProcedure.trim() || undefined,
        follow_up: followUp.trim() || undefined,
        items: cleanItems.length > 0 ? toApiPrescriptionItems(cleanItems) : undefined,
      });

      const n = cleanItems.length;
      Alert.alert('Prescription created', n > 0
        ? `${n} medicine${n === 1 ? '' : 's'} prescribed for ${patientName}.`
        : `Prescription saved for ${patientName}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Could not create prescription. Try again.';
      Alert.alert('Create failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[{ paddingTop: insets.top, backgroundColor: '#F8FAFC' }]}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.topTitle}>New Prescription</Text>
            <Text style={s.topSubtitle} numberOfLines={1}>For {patientName}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + bottomInset, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient banner */}
        {patient && (
          <View style={s.patientBanner}>
            <View style={s.patientAvatar}>
              <Text style={s.patientAvatarTxt}>
                {(patient.first_name?.[0] ?? '') + (patient.last_name?.[0] ?? '')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.patientName}>{patient.first_name} {patient.last_name}</Text>
              <View style={s.patientMeta}>
                {patient.gender && <Text style={s.patientMetaTxt}>{patient.gender}</Text>}
                {patient.age != null && <Text style={s.patientMetaTxt}>· {patient.age}y</Text>}
                {patient.phone && <Text style={s.patientMetaTxt}>· {patient.phone}</Text>}
              </View>
              {patient.allergies && (
                <View style={s.allergyBox}>
                  <Ionicons name="alert-circle" size={12} color="#DC2626" />
                  <Text style={s.allergyTxt} numberOfLines={2}>Allergies: {patient.allergies}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Dentist + Diagnosis */}
        <View style={s.cardSection}>
          <Text style={s.label}>Prescribing Dentist *</Text>
          <TouchableOpacity style={s.field} onPress={() => setDentistPickerOpen(true)}>
            <Text style={[s.fieldTxt, !dentistId && s.fieldPlaceholder]}>{dentistName}</Text>
            <Ionicons name="chevron-down" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={[s.label, { marginTop: 12 }]}>Chief Complaint</Text>
          <TextInput
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            placeholder="e.g. Pain in lower-right molar for 3 days"
            placeholderTextColor="#94a3b8"
            style={s.inputBox}
          />

          <Text style={[s.label, { marginTop: 12 }]}>Diagnosis</Text>
          <TextInput
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="e.g. Dental caries with periapical infection"
            placeholderTextColor="#94a3b8"
            style={s.inputBox}
          />

          <Text style={[s.label, { marginTop: 12 }]}>Past Dental History</Text>
          <TextInput
            value={pastDentalHistory}
            onChangeText={setPastDentalHistory}
            placeholder="Relevant previous dental history"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={2}
            style={[s.inputBox, s.textarea]}
          />

          <Text style={[s.label, { marginTop: 12 }]}>Allergies / Medical History</Text>
          <TextInput
            value={allergiesMedical}
            onChangeText={setAllergiesMedical}
            placeholder="Allergies and relevant medical history"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={2}
            style={[s.inputBox, s.textarea]}
          />

          <Text style={[s.label, { marginTop: 12 }]}>General Instructions</Text>
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Notes the patient should follow"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            style={[s.inputBox, s.textarea]}
          />
        </View>

        {/* Medicines */}
        <View>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="medical" size={18} color="#B45309" />
              <Text style={s.sectionTitle}>Medicines</Text>
              <View style={s.countDot}>
                <Text style={s.countDotTxt}>{items.length}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={addItem} activeOpacity={0.7}>
              <Ionicons name="add" size={14} color="#4361EE" />
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>

          {items.map((it, idx) => (
            <View key={idx} style={s.medCard}>
              <View style={s.medHeader}>
                <Text style={s.medIdx}>#{idx + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(idx)} style={s.removeBtn}>
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={s.label}>Medicine Name *</Text>
              <TextInput
                value={it.drug_name}
                onChangeText={(v) => updateItem(idx, 'drug_name', v)}
                placeholder="e.g. Amoxicillin 500mg"
                placeholderTextColor="#94a3b8"
                style={s.inputBox}
              />

              <Text style={[s.label, { marginTop: 10 }]}>Dosage *</Text>
              <TextInput
                value={it.dosage}
                onChangeText={(v) => updateItem(idx, 'dosage', v)}
                placeholder="e.g. 1 tablet, 5ml syrup"
                placeholderTextColor="#94a3b8"
                style={s.inputBox}
              />

              {/* Dosage schedule (morning / afternoon / evening / night) */}
              <Text style={[s.label, { marginTop: 10 }]}>Dosage Schedule</Text>
              <View style={s.scheduleRow}>
                {[
                  { key: 'morning'   as const, label: 'Morn',  icon: 'sunny' as const },
                  { key: 'afternoon' as const, label: 'Aftn',  icon: 'partly-sunny' as const },
                  { key: 'evening'   as const, label: 'Eve',   icon: 'moon-outline' as const },
                  { key: 'night'     as const, label: 'Night', icon: 'moon' as const },
                ].map((slot) => (
                  <View key={slot.key} style={s.scheduleTile}>
                    <Ionicons name={slot.icon} size={14} color="#94a3b8" />
                    <Text style={s.scheduleLbl}>{slot.label}</Text>
                    <TextInput
                      value={it[slot.key]}
                      onChangeText={(v) => updateItem(idx, slot.key, v.replace(/[^0-9]/g, '').slice(0, 2))}
                      placeholder="0"
                      placeholderTextColor="#cbd5e1"
                      keyboardType="number-pad"
                      style={s.scheduleInput}
                    />
                  </View>
                ))}
              </View>

              {/* Frequency + Duration */}
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Frequency *</Text>
                  <TouchableOpacity style={s.field} onPress={() => setActiveFreqIdx(idx)}>
                    <Text style={[s.fieldTxt, !it.frequency && s.fieldPlaceholder]} numberOfLines={1}>
                      {it.frequency || 'Pick'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Duration *</Text>
                  <TouchableOpacity style={s.field} onPress={() => setActiveDurIdx(idx)}>
                    <Text style={[s.fieldTxt, !it.duration && s.fieldPlaceholder]} numberOfLines={1}>
                      {it.duration || 'Pick'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Route + Purpose */}
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Route</Text>
                  <TouchableOpacity style={s.field} onPress={() => setActiveRouteIdx(idx)}>
                    <Text style={[s.fieldTxt, !it.route && s.fieldPlaceholder]} numberOfLines={1}>
                      {it.route || 'Oral'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Purpose</Text>
                  <TextInput
                    value={it.purpose}
                    onChangeText={(v) => updateItem(idx, 'purpose', v)}
                    placeholder="Pain relief"
                    placeholderTextColor="#94a3b8"
                    style={s.inputBox}
                  />
                </View>
              </View>

              {/* Notes */}
              <Text style={[s.label, { marginTop: 10 }]}>Notes</Text>
              <TextInput
                value={it.notes}
                onChangeText={(v) => updateItem(idx, 'notes', v)}
                placeholder="Special instructions"
                placeholderTextColor="#94a3b8"
                style={s.inputBox}
              />

              {/* Warnings */}
              <Text style={[s.label, { marginTop: 10 }]}>Warnings</Text>
              <TextInput
                value={it.warnings}
                onChangeText={(v) => updateItem(idx, 'warnings', v)}
                placeholder="Allergies, drug interactions, etc."
                placeholderTextColor="#94a3b8"
                multiline
                style={[s.inputBox, { minHeight: 60, textAlignVertical: 'top', paddingTop: 10 }]}
              />
            </View>
          ))}

          <TouchableOpacity style={s.addCardBtn} onPress={addItem} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color="#4361EE" />
            <Text style={s.addCardBtnTxt}>Add another medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Safety & Instructions collapsible */}
        <View>
          <TouchableOpacity
            style={s.collapseHeader}
            onPress={() => setShowSafety((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={16} color="#0f172a" />
            <Text style={s.collapseTitle}>Safety & Instructions</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name={showSafety ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
          </TouchableOpacity>

          {showSafety && (
            <View style={[s.cardSection, { marginTop: 4 }]}>
              <Text style={s.label}>Drug Interactions</Text>
              <TextInput
                value={interactions}
                onChangeText={setInteractions}
                placeholder="Known interactions to highlight"
                placeholderTextColor="#94a3b8"
                multiline
                style={[s.inputBox, s.textarea]}
              />

              <Text style={[s.label, { marginTop: 10 }]}>Dietary Advice</Text>
              <TextInput
                value={dietaryAdvice}
                onChangeText={setDietaryAdvice}
                placeholder="Foods to take or avoid"
                placeholderTextColor="#94a3b8"
                multiline
                style={[s.inputBox, s.textarea]}
              />

              <Text style={[s.label, { marginTop: 10 }]}>Post-Procedure Instructions</Text>
              <TextInput
                value={postProcedure}
                onChangeText={setPostProcedure}
                placeholder="What to do after the procedure"
                placeholderTextColor="#94a3b8"
                multiline
                style={[s.inputBox, s.textarea]}
              />

              <Text style={[s.label, { marginTop: 10 }]}>Follow-up</Text>
              <TextInput
                value={followUp}
                onChangeText={setFollowUp}
                placeholder="When and why to return"
                placeholderTextColor="#94a3b8"
                multiline
                style={[s.inputBox, s.textarea]}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky save bar */}
      <View style={[s.saveBar, { paddingBottom: 12 + bottomInset }]}>
        <TouchableOpacity
          style={[s.saveBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.saveBtnTxt}>Create Prescription</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      <PickerModal
        visible={dentistPickerOpen}
        title="Select Dentist"
        options={dentists.map((d) => d.name)}
        value={dentistName}
        onSelect={(name) => {
          const d = dentists.find((x) => x.name === name);
          if (d) setDentistId(d.id);
        }}
        onClose={() => setDentistPickerOpen(false)}
      />
      <PickerModal
        visible={activeFreqIdx !== null}
        title="Frequency"
        options={FREQUENCY_OPTIONS}
        value={activeFreqIdx !== null ? items[activeFreqIdx].frequency : ''}
        onSelect={(v) => { if (activeFreqIdx !== null) updateItem(activeFreqIdx, 'frequency', v); }}
        onClose={() => setActiveFreqIdx(null)}
      />
      <PickerModal
        visible={activeDurIdx !== null}
        title="Duration"
        options={DURATION_OPTIONS}
        value={activeDurIdx !== null ? items[activeDurIdx].duration : ''}
        onSelect={(v) => { if (activeDurIdx !== null) updateItem(activeDurIdx, 'duration', v); }}
        onClose={() => setActiveDurIdx(null)}
      />
      <PickerModal
        visible={activeRouteIdx !== null}
        title="Route"
        options={ROUTE_OPTIONS}
        value={activeRouteIdx !== null ? items[activeRouteIdx].route : ''}
        onSelect={(v) => { if (activeRouteIdx !== null) updateItem(activeRouteIdx, 'route', v); }}
        onClose={() => setActiveRouteIdx(null)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  topSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },

  // Patient banner
  patientBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  patientAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  patientAvatarTxt: { fontSize: 13, fontWeight: '800', color: '#4F46E5' },
  patientName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  patientMeta: { flexDirection: 'row', gap: 4, marginTop: 2 },
  patientMetaTxt: { fontSize: 11, color: '#64748b' },
  allergyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start',
  },
  allergyTxt: { fontSize: 10, color: '#DC2626', fontWeight: '700' },

  // Sections
  cardSection: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 },

  inputBox: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a',
  },
  textarea: { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 },

  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
  },
  fieldTxt: { fontSize: 14, color: '#0f172a', flex: 1 },
  fieldPlaceholder: { color: '#94a3b8' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, paddingHorizontal: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  countDot: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  countDotTxt: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EEF2FF', borderRadius: 8,
  },
  addBtnTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  // Medicine card
  medCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 6,
  },
  medHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  medIdx: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },

  scheduleRow: { flexDirection: 'row', gap: 6 },
  scheduleTile: {
    flex: 1, alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingVertical: 7, paddingHorizontal: 4, gap: 2,
  },
  scheduleLbl: { fontSize: 9, fontWeight: '700', color: '#64748b', letterSpacing: 0.3 },
  scheduleInput: {
    width: '100%', textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#0f172a',
    paddingVertical: 2,
  },

  row2: { flexDirection: 'row', gap: 8, marginTop: 10 },

  addCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#C7D2FE',
  },
  addCardBtnTxt: { fontSize: 13, fontWeight: '700', color: '#4361EE' },

  // Collapsible header
  collapseHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, padding: 12,
  },
  collapseTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  // Sticky save bar
  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingHorizontal: 16, paddingTop: 12,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#4361EE', paddingVertical: 14, borderRadius: 14,
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Picker modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8, paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  modalItemActive: { backgroundColor: '#EEF2FF' },
  modalItemTxt: { fontSize: 14, color: '#0f172a' },
  modalItemTxtActive: { color: '#4361EE', fontWeight: '700' },
});
