import React, { useCallback, useEffect, useState } from 'react';
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
import { clinicalService } from '../../services/clinical.service';
import { userService, type StaffUser } from '../../services/user.service';
import { patientService } from '../../services/patient.service';
import { useAuthStore } from '../../store/auth.store';
import { useBottomInset } from '../../hooks/useBottomInset';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';
import type { PatientStackParamList, Patient } from '../../types';

type Route = RouteProp<PatientStackParamList, 'StartConsultation'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

// ─── Web-parity option lists ─────────────────────────────────────────────────
const PROCEDURES = [
  'Root Canal Treatment', 'Extraction', 'Filling', 'Crown', 'Bridge',
  'Scaling', 'Implant', 'Orthodontics', 'Denture', 'Teeth Whitening',
  'Periapical Surgery', 'Pulpectomy', 'Pulpotomy', 'Restoration',
  'Veneer', 'Inlay', 'Onlay', 'Other',
];

const URGENCIES = [
  { key: 'immediate', label: 'Immediate', bg: '#FEE2E2', text: '#DC2626' },
  { key: 'high',      label: 'High',      bg: '#FED7AA', text: '#9A3412' },
  { key: 'medium',    label: 'Medium',    bg: '#FEF3C7', text: '#B45309' },
  { key: 'low',       label: 'Low',       bg: '#DCFCE7', text: '#15803D' },
];

// ─── Plan item form shape ────────────────────────────────────────────────────
interface PlanItemForm {
  procedure: string;
  tooth_number: string;
  estimated_cost: string;
  tooth_diagnosis: string;
  urgency: string;
  phase: string;
  notes: string;
}

function blankItem(): PlanItemForm {
  return {
    procedure: '', tooth_number: '', estimated_cost: '',
    tooth_diagnosis: '', urgency: 'medium', phase: '',
    notes: '',
  };
}

// ─── Picker modal (reused pattern) ───────────────────────────────────────────
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
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.modalItem, value === opt && s.modalItemActive]}
                onPress={() => { onSelect(opt); onClose(); }}
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

// ─── Date inline picker (lightweight) ───────────────────────────────────────
function DateInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  // Mobile date input — keep it simple: text in YYYY-MM-DD format with a "Today / +7d / +30d / Clear" helper row
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmt(d);
  };
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? 'YYYY-MM-DD'}
        placeholderTextColor="#94a3b8"
        style={s.inputBox}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        autoCorrect={false}
      />
      <View style={s.dateChipsRow}>
        <DateChip label="+7d"  onPress={() => onChange(addDays(7))} />
        <DateChip label="+14d" onPress={() => onChange(addDays(14))} />
        <DateChip label="+1mo" onPress={() => onChange(addDays(30))} />
        <DateChip label="+3mo" onPress={() => onChange(addDays(90))} />
        {!!value && <DateChip label="Clear" onPress={() => onChange('')} muted />}
      </View>
    </View>
  );
}
function DateChip({ label, onPress, muted }: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.dateChip, muted && { backgroundColor: '#F1F5F9' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.dateChipTxt, muted && { color: '#64748b' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function StartConsultationScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId, patientName, visitId, prefill, thenWritePrescription } = route.params;
  const { user, branchId } = useAuthStore();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const isEdit = !!visitId;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Visit form state (apply AI prefill if provided)
  const [dentistId, setDentistId] = useState<string>(user?.id ?? '');
  const [chiefComplaint, setChiefComplaint] = useState(prefill?.chiefComplaint ?? '');
  const [pastHistory, setPastHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [examNotes, setExamNotes] = useState(prefill?.examination ?? '');
  const [diagnosis, setDiagnosis] = useState(prefill?.diagnosis ?? '');
  const [reviewAfterDate, setReviewAfterDate] = useState('');

  // Treatment plan form state
  const [planTitle, setPlanTitle] = useState('Treatment Plan');
  const [planNotes, setPlanNotes] = useState('');
  const [planItems, setPlanItems] = useState<PlanItemForm[]>([]);
  const [finalize, setFinalize] = useState(true);

  // Picker state
  const [dentistPickerOpen, setDentistPickerOpen] = useState(false);
  const [activeProcIdx, setActiveProcIdx] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // ── Load patient + dentists + (optionally) existing visit ─────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      patientService.get(patientId),
      userService.listStaff(),
      visitId ? clinicalService.getVisit(visitId) : Promise.resolve(null),
    ]).then(([p, staff, v]) => {
      if (cancelled) return;
      setPatient(p);
      const onlyDentists = staff.filter((u) => /dentist|consultant/i.test(u.role));
      setDentists(onlyDentists.length > 0 ? onlyDentists : staff);
      if (v) {
        // Prefill from existing visit
        setDentistId(v.dentist_id ?? v.dentist?.id ?? user?.id ?? '');
        setChiefComplaint(v.chief_complaint ?? '');
        setPastHistory(v.past_dental_history ?? '');
        setAllergies(v.medical_history_notes ?? '');
        setExamNotes(v.examination_notes ?? '');
        setDiagnosis(v.diagnosis_summary ?? '');
        setReviewAfterDate((v.review_date ?? v.review_after_date ?? '').slice(0, 10));
      }
    }).catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId, visitId, user?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const dentistName = dentists.find((d) => d.id === dentistId)?.name ?? '— Select dentist —';

  const updateItem = useCallback(<K extends keyof PlanItemForm>(idx: number, key: K, value: PlanItemForm[K]) => {
    setPlanItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  }, []);
  const addItem = () => setPlanItems((prev) => [...prev, blankItem()]);
  const removeItem = (idx: number) => setPlanItems((prev) => prev.filter((_, i) => i !== idx));

  // Compute summary
  const totalEstCost = planItems.reduce((sum, it) => sum + (parseFloat(it.estimated_cost) || 0), 0);
  const validItems = planItems.filter((it) => it.procedure.trim().length > 0).length;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (alsoWritePrescription: boolean) => {
    if (!dentistId) return Alert.alert('Required', 'Please select a treating doctor.');
    if (!branchId)  return Alert.alert('Branch missing', 'No branch on session — re-login and try again.');

    // Clean plan items
    const cleanItems = planItems
      .map((it) => ({
        ...it,
        procedure: it.procedure.trim(),
        tooth_number: it.tooth_number.trim(),
        tooth_diagnosis: it.tooth_diagnosis.trim(),
        notes: it.notes.trim(),
      }))
      .filter((it) => it.procedure.length > 0);

    setSubmitting(true);
    try {
      let visit;
      if (isEdit && visitId) {
        visit = await clinicalService.updateVisit(visitId, {
          chief_complaint: chiefComplaint || undefined,
          past_dental_history: pastHistory || undefined,
          medical_history_notes: allergies || undefined,
          examination_notes: examNotes || undefined,
          diagnosis_summary: diagnosis || undefined,
          review_after_date: reviewAfterDate || null,
        });
      } else {
        visit = await clinicalService.createVisit({
          patient_id: patientId,
          dentist_id: dentistId,
          branch_id: branchId,
          chief_complaint: chiefComplaint || undefined,
          past_dental_history: pastHistory || undefined,
          medical_history_notes: allergies || undefined,
          examination_notes: examNotes || undefined,
          diagnosis_summary: diagnosis || undefined,
          review_after_date: reviewAfterDate || undefined,
        });
      }

      // Create treatment plan if user added procedures
      let planCreated = false;
      if (cleanItems.length > 0) {
        const plan = await clinicalService.createTreatmentPlan({
          patient_id: patientId,
          branch_id: branchId,
          dentist_id: dentistId,
          clinical_visit_id: visit.id,
          title: planTitle.trim() || 'Treatment Plan',
          notes: planNotes.trim() || undefined,
          items: cleanItems.map((it) => ({
            procedure: it.procedure,
            tooth_number: it.tooth_number || undefined,
            estimated_cost: parseFloat(it.estimated_cost) || 0,
            diagnosis: it.tooth_diagnosis || undefined,
            urgency: it.urgency || 'medium',
            phase: it.phase ? Number(it.phase) : undefined,
            notes: it.notes || undefined,
          })),
        });
        planCreated = true;
        if (finalize) {
          await clinicalService.acceptTreatmentPlan(plan.id).catch(() => { /* non-fatal */ });
        }
      }

      // Finalize visit (only on create, when finalize=true)
      if (!isEdit && finalize) {
        await clinicalService.finalizeVisit(visit.id).catch(() => { /* non-fatal */ });
      }

      // Navigate
      if (alsoWritePrescription || thenWritePrescription) {
        navigation.replace('NewPrescription', {
          patientId,
          patientName,
          prefillDiagnosis: thenWritePrescription?.diagnosis,
          prefillMedications: thenWritePrescription?.medications,
        });
      } else {
        const message = isEdit
          ? 'Consultation updated.'
          : finalize
            ? `Consultation finalized.${planCreated ? ' Treatments created from the plan.' : ''}`
            : 'Consultation saved as draft.';
        Alert.alert(isEdit ? 'Updated' : 'Saved', message, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Could not save consultation.';
      Alert.alert('Save failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.safe, { paddingTop: insets.top }]}>
        <TopBar title={isEdit ? 'Edit Consultation' : 'New Consultation'} onBack={() => navigation.goBack()} />
        <View style={s.center}><ActivityIndicator size="large" color="#4361EE" /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top, backgroundColor: '#F8FAFC' }}>
        <TopBar
          title={isEdit ? 'Edit Consultation' : 'New Consultation'}
          subtitle={patientName}
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 130 + bottomInset, gap: 14 }}
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

        {/* Doctor & Review date */}
        <View style={s.cardSection}>
          <Text style={s.label}>Treating Doctor *</Text>
          <TouchableOpacity
            style={[s.field, isEdit && { opacity: 0.55 }]}
            onPress={() => !isEdit && setDentistPickerOpen(true)}
            disabled={isEdit}
          >
            <Text style={[s.fieldTxt, !dentistId && s.fieldPlaceholder]}>{dentistName}</Text>
            {!isEdit && <Ionicons name="chevron-down" size={16} color="#94a3b8" />}
          </TouchableOpacity>
          {isEdit && <Text style={s.helperTxt}>Doctor and branch can't be changed after creation.</Text>}
        </View>

        {/* SOAP-like fields */}
        <Section icon="flag" iconColor="#DC2626" title="Chief Complaint" hint="What brought the patient in?">
          <TextInput
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            placeholder="e.g. Severe pain on lower right molar"
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.inputBox, s.textarea]}
          />
        </Section>

        <Section icon="time" iconColor="#0369A1" title="Past Dental History" hint="Prior dental work, recurring issues">
          <TextInput
            value={pastHistory}
            onChangeText={setPastHistory}
            placeholder="Previous treatments, last visit, etc."
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.inputBox, s.textarea]}
          />
        </Section>

        <Section icon="alert-circle" iconColor="#B45309" title="Allergies / Medical History" hint="Drug allergies, conditions">
          <TextInput
            value={allergies}
            onChangeText={setAllergies}
            placeholder="Penicillin allergy, diabetes, etc."
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.inputBox, s.textarea]}
          />
        </Section>

        <Section icon="eye" iconColor="#7C3AED" title="Examination Notes" hint="Clinical findings observed">
          <TextInput
            value={examNotes}
            onChangeText={setExamNotes}
            placeholder="Tooth #16 deep caries with pulp exposure..."
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.inputBox, s.textarea]}
          />
        </Section>

        <Section icon="medkit" iconColor="#15803D" title="Clinical Diagnosis" hint="Your clinical conclusion">
          <TextInput
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="Acute apical periodontitis on #16"
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.inputBox, s.textarea]}
          />
        </Section>

        {/* Planned procedures */}
        <View>
          <View style={s.planHeader}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="git-branch" size={18} color="#4361EE" />
              <Text style={s.sectionTitle}>Planned Procedures</Text>
              {planItems.length > 0 && (
                <View style={s.countDot}>
                  <Text style={s.countDotTxt}>{validItems}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.addBtn} onPress={addItem} activeOpacity={0.7}>
              <Ionicons name="add" size={14} color="#4361EE" />
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>

          {planItems.length > 0 && (
            <View style={s.planMeta}>
              <Text style={s.label}>Plan Title</Text>
              <TextInput
                value={planTitle}
                onChangeText={setPlanTitle}
                placeholder="Treatment Plan"
                placeholderTextColor="#94a3b8"
                style={s.inputBox}
              />
              <Text style={[s.label, { marginTop: 10 }]}>Plan Notes</Text>
              <TextInput
                value={planNotes}
                onChangeText={setPlanNotes}
                placeholder="Overall plan notes (optional)"
                placeholderTextColor="#94a3b8"
                style={s.inputBox}
              />

              {totalEstCost > 0 && (
                <View style={s.planTotal}>
                  <Text style={s.planTotalLbl}>Estimated Total</Text>
                  <Text style={s.planTotalVal}>{formatCurrency(totalEstCost)}</Text>
                </View>
              )}
            </View>
          )}

          {planItems.length === 0 ? (
            <TouchableOpacity style={s.addCardBtn} onPress={addItem} activeOpacity={0.7}>
              <Ionicons name="add" size={16} color="#4361EE" />
              <Text style={s.addCardBtnTxt}>Add a planned procedure</Text>
            </TouchableOpacity>
          ) : (
            planItems.map((it, idx) => (
              <View key={idx} style={s.procCard}>
                <View style={s.procHeader}>
                  <Text style={s.procIdx}>Procedure {idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeItem(idx)} style={s.removeBtn}>
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <Text style={s.label}>Procedure *</Text>
                <TouchableOpacity style={s.field} onPress={() => setActiveProcIdx(idx)}>
                  <Text style={[s.fieldTxt, !it.procedure && s.fieldPlaceholder]}>
                    {it.procedure || 'Pick a procedure'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                </TouchableOpacity>

                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Tooth #</Text>
                    <TextInput
                      value={it.tooth_number}
                      onChangeText={(v) => updateItem(idx, 'tooth_number', v)}
                      placeholder="16 or 16, 17"
                      placeholderTextColor="#94a3b8"
                      style={s.inputBox}
                      keyboardType="numbers-and-punctuation"
                      maxLength={20}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Est. Cost</Text>
                    <View style={s.costInputWrap}>
                      <Text style={s.costInputSymbol}>{getCurrencySymbol()}</Text>
                      <TextInput
                        value={it.estimated_cost}
                        onChangeText={(v) => updateItem(idx, 'estimated_cost', v.replace(/[^0-9.]/g, ''))}
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        keyboardType="decimal-pad"
                        style={s.costInput}
                      />
                    </View>
                  </View>
                </View>

                <Text style={[s.label, { marginTop: 10 }]}>Tooth Diagnosis</Text>
                <TextInput
                  value={it.tooth_diagnosis}
                  onChangeText={(v) => updateItem(idx, 'tooth_diagnosis', v)}
                  placeholder="Deep caries with pulp exposure"
                  placeholderTextColor="#94a3b8"
                  style={s.inputBox}
                />

                <Text style={[s.label, { marginTop: 10 }]}>Urgency</Text>
                <View style={s.urgencyRow}>
                  {URGENCIES.map((u) => {
                    const active = it.urgency === u.key;
                    return (
                      <TouchableOpacity
                        key={u.key}
                        style={[
                          s.urgencyChip,
                          { backgroundColor: active ? u.bg : '#fff', borderColor: active ? u.text : '#E2E8F0' },
                        ]}
                        onPress={() => updateItem(idx, 'urgency', u.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.urgencyTxt, { color: active ? u.text : '#64748b' }]}>{u.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Phase</Text>
                    <TextInput
                      value={it.phase}
                      onChangeText={(v) => updateItem(idx, 'phase', v.replace(/[^0-9]/g, '').slice(0, 2))}
                      placeholder="1"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      style={s.inputBox}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={s.label}>Notes</Text>
                    <TextInput
                      value={it.notes}
                      onChangeText={(v) => updateItem(idx, 'notes', v)}
                      placeholder="Per-procedure note"
                      placeholderTextColor="#94a3b8"
                      style={s.inputBox}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Review After Date */}
        <Section icon="calendar" iconColor="#4F46E5" title="Review After Date" hint="When should the patient return?">
          <DateInput value={reviewAfterDate} onChange={setReviewAfterDate} placeholder="YYYY-MM-DD" />
        </Section>

        {/* Finalize toggle (only on create) */}
        {!isEdit && (
          <TouchableOpacity
            style={[s.finalizeRow, finalize && s.finalizeRowActive]}
            onPress={() => setFinalize((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, finalize && s.checkboxActive]}>
              {finalize && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.finalizeTitle}>Finalize & accept plan</Text>
              <Text style={s.finalizeSub}>
                Marks the visit as Finalized, accepts the plan, and creates treatments. Uncheck to save as draft.
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Sticky save bar */}
      <View style={[s.saveBar, { paddingBottom: 12 + bottomInset }]}>
        <TouchableOpacity
          style={s.saveSecondary}
          onPress={() => handleSubmit(true)}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Ionicons name="pulse" size={15} color="#4361EE" />
          <Text style={s.saveSecondaryTxt}>Save + Rx</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.savePrimary, submitting && { opacity: 0.6 }]}
          onPress={() => handleSubmit(false)}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.savePrimaryTxt}>{isEdit ? 'Save Changes' : 'Save Consultation'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      <PickerModal
        visible={dentistPickerOpen}
        title="Select Doctor"
        options={dentists.map((d) => d.name)}
        value={dentistName}
        onSelect={(name) => {
          const d = dentists.find((x) => x.name === name);
          if (d) setDentistId(d.id);
        }}
        onClose={() => setDentistPickerOpen(false)}
      />
      <PickerModal
        visible={activeProcIdx !== null}
        title="Procedure"
        options={PROCEDURES}
        value={activeProcIdx !== null ? planItems[activeProcIdx].procedure : ''}
        onSelect={(v) => { if (activeProcIdx !== null) updateItem(activeProcIdx, 'procedure', v); }}
        onClose={() => setActiveProcIdx(null)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Helper components ───────────────────────────────────────────────────────
function TopBar({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <View style={s.topbar}>
      <TouchableOpacity onPress={onBack} style={s.iconBtn}>
        <Ionicons name="arrow-back" size={20} color="#0f172a" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.topTitle}>{title}</Text>
        {subtitle && <Text style={s.topSubtitle} numberOfLines={1}>For {subtitle}</Text>}
      </View>
    </View>
  );
}

function Section({
  icon, iconColor, title, hint, children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.cardSection}>
      <View style={s.sectionHead}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: iconColor + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={15} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionLabel}>{title}</Text>
          {hint && <Text style={s.sectionHint}>{hint}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  cardSection: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  sectionHint: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 },
  helperTxt: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

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

  // Plan section
  planHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, paddingHorizontal: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  countDot: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  countDotTxt: { fontSize: 11, fontWeight: '700', color: '#4361EE' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#EEF2FF', borderRadius: 8,
  },
  addBtnTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  planMeta: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  planTotal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  planTotalLbl: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  planTotalVal: { fontSize: 15, fontWeight: '800', color: '#0f172a' },

  procCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 6,
  },
  procHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  procIdx: { fontSize: 12, fontWeight: '700', color: '#475569' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },

  row2: { flexDirection: 'row', gap: 8, marginTop: 10 },

  costInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12,
  },
  costInputSymbol: { fontSize: 13, color: '#64748b', fontWeight: '600', marginRight: 6 },
  costInput: { flex: 1, fontSize: 14, color: '#0f172a', paddingVertical: 10 },

  urgencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  urgencyChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1,
  },
  urgencyTxt: { fontSize: 11, fontWeight: '700' },

  addCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#C7D2FE',
  },
  addCardBtnTxt: { fontSize: 13, fontWeight: '700', color: '#4361EE' },

  dateChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  dateChip: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  dateChipTxt: { fontSize: 11, fontWeight: '700', color: '#4361EE' },

  // Finalize toggle
  finalizeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  finalizeRowActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, marginTop: 2,
    borderWidth: 1.5, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#4361EE', borderColor: '#4361EE' },
  finalizeTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  finalizeSub: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },

  // Sticky save bar
  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingHorizontal: 16, paddingTop: 12,
  },
  saveSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  saveSecondaryTxt: { fontSize: 13, fontWeight: '700', color: '#4361EE' },
  savePrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#4361EE', paddingVertical: 14, borderRadius: 14,
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  savePrimaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Picker modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
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
