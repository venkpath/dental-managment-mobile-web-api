import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  aiService,
  type ClinicalNotesResponse,
  type PrescriptionResponse,
  type TreatmentPlanResponse,
} from '../../../services/ai.service';
import { useAuthStore } from '../../../store/auth.store';
import { formatCurrency } from '../../../utils/format';
import type { Patient } from '../../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function copyText(text: string) {
  // Clipboard from react-native is deprecated but still works; on RN 0.74+ use @react-native-clipboard
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Clipboard as any).setString(text);
    Alert.alert('Copied', 'SOAP note copied to clipboard.');
  } catch {
    Alert.alert('Copy failed', 'Try selecting the text manually.');
  }
}

function riskStyle(level: string) {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return { bg: '#FEE2E2', text: '#991B1B', label: 'CRITICAL' };
    case 'high':     return { bg: '#FED7AA', text: '#9A3412', label: 'HIGH' };
    case 'moderate': return { bg: '#FEF3C7', text: '#B45309', label: 'MODERATE' };
    default:         return { bg: '#DCFCE7', text: '#15803D', label: 'LOW' };
  }
}

function urgencyStyle(urgency: string) {
  switch ((urgency ?? '').toLowerCase()) {
    case 'immediate':
    case 'emergency':
      return { bg: '#FEE2E2', text: '#DC2626' };
    case 'soon':
    case 'urgent':
      return { bg: '#FED7AA', text: '#9A3412' };
    case 'routine':
      return { bg: '#DBEAFE', text: '#2563EB' };
    default:
      return { bg: '#F1F5F9', text: '#64748B' };
  }
}

// ─── Section card (collapsible) ──────────────────────────────────────────────
function ResultCard({
  title, subtitle, icon, iconColor, expanded, onToggle, onCopy, onRegenerate, busy, children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={s.resultCard}>
      <TouchableOpacity style={s.resultHead} onPress={onToggle} activeOpacity={0.75}>
        <View style={[s.resultIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.resultTitle}>{title}</Text>
          {subtitle && <Text style={s.resultSub}>{subtitle}</Text>}
        </View>
        {!!onCopy && (
          <TouchableOpacity onPress={onCopy} style={s.iconSmall} hitSlop={6}>
            <Ionicons name="copy-outline" size={14} color="#64748b" />
          </TouchableOpacity>
        )}
        {!!onRegenerate && (
          <TouchableOpacity onPress={onRegenerate} style={s.iconSmall} hitSlop={6} disabled={busy}>
            {busy
              ? <ActivityIndicator size="small" color="#4361EE" />
              : <Ionicons name="refresh" size={14} color="#4361EE" />
            }
          </TouchableOpacity>
        )}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
      </TouchableOpacity>
      {expanded && <View style={s.resultBody}>{children}</View>}
    </View>
  );
}

// ─── Field block with label ─────────────────────────────────────────────────
function FieldBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────
export interface AINotesTabProps {
  patientId: string;
  patient: Patient | null;
  patientName: string;
  onApplyConsultation: (data: { chiefComplaint: string; soap: ClinicalNotesResponse }) => void;
  onApplyConsultationWithRx: (data: { chiefComplaint: string; soap: ClinicalNotesResponse; rx: PrescriptionResponse }) => void;
  onApplyPrescription: (data: { diagnosis: string; rx: PrescriptionResponse }) => void;
}

export function AINotesTab({
  patientId, patient, onApplyConsultation, onApplyConsultationWithRx, onApplyPrescription,
}: AINotesTabProps) {
  const { branchId } = useAuthStore();

  // Inputs
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [dentistNotes, setDentistNotes] = useState('');
  const [teeth, setTeeth] = useState('');
  const [existingMeds, setExistingMeds] = useState('');

  // Outputs
  const [soap, setSoap] = useState<ClinicalNotesResponse | null>(null);
  const [plan, setPlan] = useState<TreatmentPlanResponse | null>(null);
  const [rx, setRx] = useState<PrescriptionResponse | null>(null);

  // UI state
  const [generating, setGenerating] = useState<null | 'full' | 'rx' | 'soap' | 'plan'>(null);
  const [soapExpanded, setSoapExpanded] = useState(true);
  const [planExpanded, setPlanExpanded] = useState(true);
  const [rxExpanded, setRxExpanded] = useState(true);

  // ── Validation ────────────────────────────────────────────────────────────
  const validateInputs = useCallback((requireDiagnosis = false): boolean => {
    if (chiefComplaint.trim().length < 3) {
      Alert.alert('Chief complaint too short', 'Please write at least 3 characters.');
      return false;
    }
    if (dentistNotes.trim().length < 10) {
      Alert.alert('Visit notes too short', 'Please write at least 10 characters of clinical observations.');
      return false;
    }
    if (requireDiagnosis && !soap?.assessment) {
      Alert.alert('SOAP needed first', 'Generate a SOAP note before generating a prescription.');
      return false;
    }
    return true;
  }, [chiefComplaint, dentistNotes, soap]);

  // ── Generators ────────────────────────────────────────────────────────────
  const generateSoap = async () => {
    const r = await aiService.generateClinicalNotes({
      patient_id: patientId,
      dentist_notes: dentistNotes.trim(),
      chief_complaint: chiefComplaint.trim() || undefined,
    });
    setSoap(r);
    return r;
  };

  const generatePlan = async () => {
    const r = await aiService.generateTreatmentPlan({
      patient_id: patientId,
      chief_complaint: chiefComplaint.trim(),
      dentist_notes: dentistNotes.trim(),
    });
    setPlan(r);
    return r;
  };

  const generateRx = async (diagnosis: string) => {
    const tooth_numbers = teeth.split(/[\s,]+/).filter(Boolean);
    const r = await aiService.generatePrescription({
      patient_id: patientId,
      diagnosis: diagnosis.trim(),
      chief_complaint: chiefComplaint.trim() || undefined,
      allergies_medical_history: patient?.allergies ?? undefined,
      tooth_numbers: tooth_numbers.length > 0 ? tooth_numbers : undefined,
      existing_medications: existingMeds.trim() || undefined,
      branch_id: branchId ?? undefined,
    });
    setRx(r);
    return r;
  };

  const handleGenerateFull = async () => {
    if (!validateInputs()) return;
    setGenerating('full');
    try {
      const [soapRes, planRes] = await Promise.all([generateSoap(), generatePlan()]);
      // Then generate prescription from soap's diagnosis
      const diagnosis = soapRes.assessment;
      if (diagnosis && diagnosis.trim().length >= 5) {
        await generateRx(diagnosis);
      }
      Alert.alert('Generated', 'SOAP, treatment plan, and prescription are ready.');
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Generation failed.';
      Alert.alert('Generation failed', msg);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateRxOnly = async () => {
    if (!validateInputs(true)) return;
    setGenerating('rx');
    try {
      await generateRx(soap!.assessment);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Could not generate prescription.';
      Alert.alert('Failed', msg);
    } finally {
      setGenerating(null);
    }
  };

  const handleRegenerateSoap = async () => {
    if (!validateInputs()) return;
    setGenerating('soap');
    try { await generateSoap(); }
    catch (err) { Alert.alert('Failed', (err as { message?: string })?.message ?? 'Try again.'); }
    finally { setGenerating(null); }
  };

  const handleRegeneratePlan = async () => {
    if (!validateInputs()) return;
    setGenerating('plan');
    try { await generatePlan(); }
    catch (err) { Alert.alert('Failed', (err as { message?: string })?.message ?? 'Try again.'); }
    finally { setGenerating(null); }
  };

  const handleCopySoap = () => {
    if (!soap) return;
    const text = [
      `SOAP Note for ${soap.patient_name ?? ''}`.trim(),
      `Generated: ${new Date(soap.generated_at).toLocaleString()}`,
      '',
      'Subjective:', soap.subjective ?? '',
      '',
      'Objective:', soap.objective ?? '',
      '',
      'Assessment:', soap.assessment ?? '',
      '',
      'Plan:', soap.plan ?? '',
    ].join('\n');
    copyText(text);
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Allergy alert */}
      {patient?.allergies && (
        <View style={s.allergyBox}>
          <Ionicons name="warning" size={14} color="#92400E" />
          <Text style={s.allergyTxt} numberOfLines={2}>
            <Text style={{ fontWeight: '800' }}>Allergies: </Text>
            {patient.allergies}
          </Text>
        </View>
      )}

      {/* Inputs */}
      <View style={s.inputCard}>
        <View style={s.cardHead}>
          <Ionicons name="sparkles" size={18} color="#7C3AED" />
          <Text style={s.cardTitle}>AI Visit Notes</Text>
        </View>
        <Text style={s.cardSub}>
          Write what you saw and the AI drafts SOAP notes, a treatment plan, and a prescription.
        </Text>

        <Text style={s.label}>Chief Complaint *</Text>
        <TextInput
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
          placeholder="e.g. Severe pain on lower right molar"
          placeholderTextColor="#94a3b8"
          style={s.input}
        />

        <Text style={[s.label, { marginTop: 10 }]}>Visit Notes *</Text>
        <TextInput
          value={dentistNotes}
          onChangeText={setDentistNotes}
          placeholder="Findings, tooth numbers, advice given... Be specific — the more detail, the better the output."
          placeholderTextColor="#94a3b8"
          multiline
          style={[s.input, s.textarea]}
        />
        <Text style={s.helperTxt}>{dentistNotes.length} chars (min 10)</Text>

        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Teeth</Text>
            <TextInput
              value={teeth}
              onChangeText={setTeeth}
              placeholder="16, 17, 26"
              placeholderTextColor="#94a3b8"
              style={s.input}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Current Meds</Text>
            <TextInput
              value={existingMeds}
              onChangeText={setExistingMeds}
              placeholder="Aspirin, Metformin"
              placeholderTextColor="#94a3b8"
              style={s.input}
            />
          </View>
        </View>

        {/* Generate buttons */}
        <View style={s.genRow}>
          <TouchableOpacity
            style={[s.genBtnPrimary, generating && { opacity: 0.6 }]}
            onPress={handleGenerateFull}
            disabled={generating !== null}
            activeOpacity={0.85}
          >
            {generating === 'full' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={15} color="#fff" />
                <Text style={s.genBtnPrimaryTxt}>Generate Full Visit</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.genBtnGhost, (!soap || generating !== null) && { opacity: 0.5 }]}
            onPress={handleGenerateRxOnly}
            disabled={!soap || generating !== null}
          >
            {generating === 'rx' ? (
              <ActivityIndicator size="small" color="#4361EE" />
            ) : (
              <>
                <Ionicons name="pulse" size={14} color="#4361EE" />
                <Text style={s.genBtnGhostTxt}>Rx only</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SOAP card ── */}
      {soap && (
        <ResultCard
          title="SOAP Note"
          subtitle={`Generated ${new Date(soap.generated_at).toLocaleTimeString()}`}
          icon="reader"
          iconColor="#15803D"
          expanded={soapExpanded}
          onToggle={() => setSoapExpanded((v) => !v)}
          onCopy={handleCopySoap}
          onRegenerate={handleRegenerateSoap}
          busy={generating === 'soap'}
        >
          <FieldBlock label="Subjective"     value={soap.subjective} />
          <FieldBlock label="Objective"      value={soap.objective} />
          <FieldBlock label="Assessment"     value={soap.assessment} />
          <FieldBlock label="Plan"           value={soap.plan} />
          <FieldBlock label="Follow-up"      value={soap.follow_up} />
          <FieldBlock label="Additional Notes" value={soap.additional_notes} />

          {!!soap.icd_codes?.length && (
            <View>
              <Text style={s.fieldLabel}>ICD Codes</Text>
              <View style={s.chipRow}>
                {soap.icd_codes.map((c, i) => (
                  <View key={i} style={s.icdChip}>
                    <Text style={s.icdCode}>{c.code}</Text>
                    <Text style={s.icdDesc} numberOfLines={1}>{c.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!soap.teeth_involved?.length && (
            <View>
              <Text style={s.fieldLabel}>Teeth Involved</Text>
              <View style={s.chipRow}>
                {soap.teeth_involved.map((t) => (
                  <View key={t} style={s.toothChip}>
                    <Text style={s.toothChipTxt}>#{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={s.applyBtn}
            onPress={() => onApplyConsultation({ chiefComplaint, soap })}
          >
            <Ionicons name="checkmark-circle" size={14} color="#fff" />
            <Text style={s.applyBtnTxt}>Apply as Consultation</Text>
          </TouchableOpacity>
        </ResultCard>
      )}

      {/* ── Treatment Plan card ── */}
      {plan && (
        <ResultCard
          title="Treatment Plan"
          subtitle={`${plan.phases?.length ?? 0} phase${(plan.phases?.length ?? 0) === 1 ? '' : 's'} · est. ${plan.estimated_total_sessions ?? '?'} sessions`}
          icon="git-branch"
          iconColor="#4361EE"
          expanded={planExpanded}
          onToggle={() => setPlanExpanded((v) => !v)}
          onRegenerate={handleRegeneratePlan}
          busy={generating === 'plan'}
        >
          <View style={s.riskRow}>
            <Text style={s.fieldLabel}>Risk Level</Text>
            {(() => {
              const r = riskStyle(plan.risk_level);
              return (
                <View style={[s.riskPill, { backgroundColor: r.bg }]}>
                  <Text style={[s.riskTxt, { color: r.text }]}>{r.label}</Text>
                </View>
              );
            })()}
          </View>

          {!!plan.summary && <FieldBlock label="Summary" value={plan.summary} />}

          {plan.phases?.map((phase) => (
            <View key={phase.phase_number} style={s.phaseCard}>
              <View style={s.phaseHead}>
                <View style={s.phaseNum}>
                  <Text style={s.phaseNumTxt}>{phase.phase_number}</Text>
                </View>
                <Text style={s.phaseName}>{phase.phase_name}</Text>
                <View style={[s.priorityPill, urgencyStyle(phase.priority)]}>
                  <Text style={[s.priorityTxt, { color: urgencyStyle(phase.priority).text }]}>
                    {phase.priority}
                  </Text>
                </View>
              </View>
              {phase.treatments?.map((t, i) => (
                <View key={i} style={s.treatRow}>
                  <View style={s.treatHead}>
                    <Text style={s.toothNum}>#{t.tooth}</Text>
                    <Text style={s.treatProc}>{t.procedure}</Text>
                    <View style={[s.urgPill, { backgroundColor: urgencyStyle(t.urgency).bg }]}>
                      <Text style={[s.urgTxt, { color: urgencyStyle(t.urgency).text }]}>{t.urgency}</Text>
                    </View>
                  </View>
                  <Text style={s.treatCond}>{t.condition}</Text>
                  <Text style={s.treatRationale}>{t.rationale}</Text>
                  <Text style={s.treatSessions}>{t.estimated_sessions} session{t.estimated_sessions === 1 ? '' : 's'}</Text>
                </View>
              ))}
            </View>
          ))}

          {!!plan.preventive_recommendations?.length && (
            <View>
              <Text style={s.fieldLabel}>Preventive Recommendations</Text>
              {plan.preventive_recommendations.map((r, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={s.bullet} />
                  <Text style={s.bulletTxt}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {!!plan.follow_up_schedule && <FieldBlock label="Follow-up Schedule" value={plan.follow_up_schedule} />}
          {!!plan.notes && <FieldBlock label="Plan Notes" value={plan.notes} />}
        </ResultCard>
      )}

      {/* ── Prescription card ── */}
      {rx && (
        <ResultCard
          title="Prescription"
          subtitle={`${rx.medications.length} medication${rx.medications.length === 1 ? '' : 's'}`}
          icon="pulse"
          iconColor="#B45309"
          expanded={rxExpanded}
          onToggle={() => setRxExpanded((v) => !v)}
        >
          {!!rx.warnings?.length && (
            <View style={s.warningBox}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <View style={{ flex: 1 }}>
                {rx.warnings.map((w, i) => (
                  <Text key={i} style={s.warningTxt}>{w}</Text>
                ))}
              </View>
            </View>
          )}

          <Text style={s.fieldLabel}>Medications</Text>
          {rx.medications.map((m, i) => (
            <View key={i} style={s.medCard}>
              <View style={s.medHead}>
                <Text style={s.medName}>{m.drug_name}</Text>
                {m.in_stock != null && (
                  <View style={[s.stockPill, { backgroundColor: m.in_stock ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Text style={[s.stockTxt, { color: m.in_stock ? '#15803D' : '#B45309' }]}>
                      {m.in_stock ? 'In stock' : 'Out of stock'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.medMetaRow}>
                <View style={s.medMetaTag}><Text style={s.medMetaTxt}>{m.dosage}</Text></View>
                <View style={s.medMetaTag}><Text style={s.medMetaTxt}>{m.frequency}</Text></View>
                <View style={s.medMetaTag}><Text style={s.medMetaTxt}>{m.duration}</Text></View>
                {!!m.route && (
                  <View style={s.medMetaTag}><Text style={s.medMetaTxt}>{m.route}</Text></View>
                )}
              </View>
              {!!m.purpose && <Text style={s.medPurpose}>For: {m.purpose}</Text>}
              {!!m.instructions && <Text style={s.medInstr}>{m.instructions}</Text>}
            </View>
          ))}

          {!!rx.post_procedure_instructions?.length && (
            <View>
              <Text style={s.fieldLabel}>Post-Procedure Instructions</Text>
              {rx.post_procedure_instructions.map((p, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={s.bullet} />
                  <Text style={s.bulletTxt}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          <FieldBlock label="Dietary Advice" value={rx.dietary_advice} />
          <FieldBlock label="Follow-up" value={rx.follow_up} />

          {/* Apply buttons */}
          <View style={s.applyRow}>
            <TouchableOpacity
              style={s.applyBtnGhost}
              onPress={() => onApplyPrescription({ diagnosis: soap?.assessment ?? chiefComplaint, rx })}
            >
              <Ionicons name="medical" size={13} color="#4361EE" />
              <Text style={s.applyBtnGhostTxt}>Rx only</Text>
            </TouchableOpacity>
            {soap && (
              <TouchableOpacity
                style={s.applyBtn}
                onPress={() => onApplyConsultationWithRx({ chiefComplaint, soap, rx })}
              >
                <Ionicons name="checkmark-done" size={14} color="#fff" />
                <Text style={s.applyBtnTxt}>Consultation + Rx</Text>
              </TouchableOpacity>
            )}
          </View>
        </ResultCard>
      )}

      {/* Empty state */}
      {!soap && !plan && !rx && (
        <View style={s.emptyBox}>
          <View style={s.emptyIcon}>
            <Ionicons name="sparkles" size={28} color="#7C3AED" />
          </View>
          <Text style={s.emptyTitle}>Draft a visit with AI</Text>
          <Text style={s.emptySub}>
            Fill the form above and tap Generate. The AI drafts a SOAP note, treatment plan, and prescription you can review and apply.
          </Text>
        </View>
      )}

      {/* Disclaimer */}
      <Text style={s.disclaimer}>
        AI-assisted documentation for reference only. Clinician judgment required before applying.
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Allergy banner
  allergyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  allergyTxt: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 16 },

  // Input card
  inputCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 4 },

  label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: '#0f172a',
  },
  textarea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 },
  helperTxt: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  row2: { flexDirection: 'row', gap: 8, marginTop: 10 },

  // Generate buttons row
  genRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  genBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7C3AED', paddingVertical: 12, borderRadius: 12,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  genBtnPrimaryTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  genBtnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
  },
  genBtnGhostTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  // Result card
  resultCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  resultHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  resultIcon: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  resultTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  resultSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  iconSmall: { padding: 4 },
  resultBody: {
    paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },

  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4,
  },
  fieldValue: { fontSize: 13, color: '#0f172a', lineHeight: 19 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  icdChip: {
    flexDirection: 'row', gap: 4,
    backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    maxWidth: '100%',
  },
  icdCode: { fontSize: 11, fontWeight: '800', color: '#4361EE' },
  icdDesc: { fontSize: 11, color: '#475569', flexShrink: 1 },
  toothChip: { backgroundColor: '#4361EE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  toothChipTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // Apply buttons
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#4361EE', paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
  applyBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  applyBtnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  applyBtnGhostTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },
  applyRow: { flexDirection: 'row', gap: 6, marginTop: 4 },

  // Plan
  riskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riskPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  riskTxt: { fontSize: 10, fontWeight: '800' },

  phaseCard: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  phaseHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phaseNum: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: '#4361EE',
    alignItems: 'center', justifyContent: 'center',
  },
  phaseNumTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  phaseName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  priorityTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  treatRow: {
    backgroundColor: '#fff', borderRadius: 8, padding: 8, gap: 3,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  treatHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toothNum: { fontSize: 12, fontWeight: '800', color: '#4361EE' },
  treatProc: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  urgPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
  urgTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  treatCond: { fontSize: 11, color: '#64748b' },
  treatRationale: { fontSize: 11, color: '#475569', lineHeight: 15, marginTop: 2 },
  treatSessions: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 2 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94a3b8', marginTop: 8 },
  bulletTxt: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },

  // Rx
  warningBox: {
    flexDirection: 'row', gap: 6, backgroundColor: '#FEE2E2',
    borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 10,
  },
  warningTxt: { fontSize: 12, color: '#991B1B', lineHeight: 18 },

  medCard: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 5,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  medHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  medName: { fontSize: 13, fontWeight: '800', color: '#0f172a', flex: 1 },
  stockPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  stockTxt: { fontSize: 9, fontWeight: '800' },

  medMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  medMetaTag: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  medMetaTxt: { fontSize: 11, fontWeight: '600', color: '#475569' },
  medPurpose: { fontSize: 11, color: '#475569', fontStyle: 'italic' },
  medInstr: { fontSize: 11, color: '#64748b', lineHeight: 15 },

  // Empty
  emptyBox: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 30, paddingHorizontal: 24,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 17 },

  disclaimer: {
    fontSize: 10, color: '#94a3b8', textAlign: 'center',
    fontStyle: 'italic', paddingVertical: 4,
  },
});
