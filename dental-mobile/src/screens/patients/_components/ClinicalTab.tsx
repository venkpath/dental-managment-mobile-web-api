import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../../utils/format';
import type { Treatment } from '../../../types';
import type { ClinicalVisit, TreatmentPlan } from '../../../services/clinical.service';
import type { Prescription } from '../../../services/prescription.service';

// Web uses 2 items per page for each sub-section
const PAGE_SIZE = 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function planStatusStyle(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'accepted':    return { bg: '#E0E7FF', text: '#4F46E5', label: 'Accepted',    accent: '#4F46E5' };
    case 'in_progress': return { bg: '#FEF3C7', text: '#B45309', label: 'In Progress', accent: '#B45309' };
    case 'completed':   return { bg: '#DCFCE7', text: '#15803D', label: 'Completed',   accent: '#15803D' };
    case 'cancelled':   return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled',   accent: '#DC2626' };
    default:            return { bg: '#DBEAFE', text: '#2563EB', label: 'Proposed',    accent: '#2563EB' };
  }
}

function visitStatusStyle(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'finalized': return { bg: '#DCFCE7', text: '#15803D', label: 'Finalized', accent: '#15803D' };
    case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled', accent: '#DC2626' };
    default:          return { bg: '#FEF3C7', text: '#B45309', label: 'In Progress', accent: '#B45309' };
  }
}

function treatmentStatusStyle(status: string) {
  switch (status) {
    case 'COMPLETED':   return { bg: '#DCFCE7', text: '#15803D', label: 'Completed',   accent: '#15803D' };
    case 'IN_PROGRESS': return { bg: '#FEF3C7', text: '#B45309', label: 'In Progress', accent: '#B45309' };
    case 'PLANNED':     return { bg: '#DBEAFE', text: '#2563EB', label: 'Planned',     accent: '#2563EB' };
    default:            return { bg: '#F1F5F9', text: '#64748B', label: 'Planned',     accent: '#64748B' };
  }
}

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const target = new Date(date);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ─── Reusable section pagination ─────────────────────────────────────────────
function PaginationBar({
  page, totalPages, total, onChange,
}: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <View style={styles.pag}>
      <Text style={styles.pagTxt}>
        <Text style={styles.pagBold}>{from}–{to}</Text> of {total}
      </Text>
      <View style={styles.pagBtns}>
        <TouchableOpacity
          style={[styles.pagBtn, page === 1 && styles.pagBtnDisabled]}
          disabled={page === 1}
          onPress={() => onChange(page - 1)}
        >
          <Ionicons name="chevron-back" size={14} color={page === 1 ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>
        <View style={styles.pagIndicator}>
          <Text style={styles.pagIndicatorTxt}>{page} / {totalPages}</Text>
        </View>
        <TouchableOpacity
          style={[styles.pagBtn, page >= totalPages && styles.pagBtnDisabled]}
          disabled={page >= totalPages}
          onPress={() => onChange(page + 1)}
        >
          <Ionicons name="chevron-forward" size={14} color={page >= totalPages ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({
  icon, iconColor, title, count, addLabel, onAdd,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  count: number;
  addLabel?: string;
  onAdd?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {count > 0 && (
          <View style={styles.countDot}>
            <Text style={styles.countDotTxt}>{count}</Text>
          </View>
        )}
      </View>
      {addLabel && onAdd && (
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.7}>
          <Ionicons name="add" size={14} color="#4361EE" />
          <Text style={styles.addBtnTxt}>{addLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export interface ClinicalTabProps {
  loading: boolean;
  visits: ClinicalVisit[];
  treatmentPlans: TreatmentPlan[];
  treatments: Treatment[];
  prescriptions: Prescription[];
  onStartConsultation: () => void;
  onAddTreatment: () => void;
  onNewPrescription: () => void;
  onOpenVisit: (id: string) => void;
  onEditVisit: (id: string) => void;
  onBookFollowUp: (visitId: string, reviewDate: string) => void;
  onOpenTreatment: (id: string) => void;
  onOpenPrescription: (id: string) => void;
}

export function ClinicalTab(props: ClinicalTabProps) {
  if (props.loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#4361EE" />
      </View>
    );
  }

  return (
    <View style={{ gap: 18 }}>
      <PlansSection plans={props.treatmentPlans} />
      <ConsultationsSection
        visits={props.visits}
        onStart={props.onStartConsultation}
        onOpen={props.onOpenVisit}
        onEdit={props.onEditVisit}
        onBookFollowUp={props.onBookFollowUp}
      />
      <PrescriptionsSection
        prescriptions={props.prescriptions}
        onAdd={props.onNewPrescription}
        onOpen={props.onOpenPrescription}
      />
      <TreatmentsSection
        treatments={props.treatments}
        onAdd={props.onAddTreatment}
        onOpen={props.onOpenTreatment}
      />
    </View>
  );
}

// ─── 1. Treatment Plans ──────────────────────────────────────────────────────
function PlansSection({ plans }: { plans: TreatmentPlan[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(plans.length / PAGE_SIZE));
  const view = useMemo(
    () => plans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [plans, page],
  );

  return (
    <View>
      <SectionHeader
        icon="git-branch"
        iconColor="#4361EE"
        title="Treatment Plans"
        count={plans.length}
      />
      {plans.length === 0 ? (
        <EmptyMini label="No treatment plans yet" />
      ) : (
        <>
          {view.map((p) => {
            const st = planStatusStyle(p.status);
            const items = p.items ?? [];
            const shown = items.slice(0, 3);
            const remaining = Math.max(0, items.length - shown.length);
            return (
              <View key={p.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: st.accent }]}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{p.title || 'Treatment Plan'}</Text>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillTxt, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillTxt}>
                      {items.length} procedure{items.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillTxt}>
                      Est. {formatCurrency(Number(p.total_estimated_cost ?? 0))}
                    </Text>
                  </View>
                </View>
                {shown.length > 0 && (
                  <View style={{ gap: 4 }}>
                    {shown.map((it) => (
                      <View key={it.id} style={styles.itemRow}>
                        <View style={styles.itemBullet} />
                        <Text style={styles.itemTxt} numberOfLines={1}>
                          {it.tooth_number ? `#${it.tooth_number}  ` : ''}{it.procedure}
                          {it.urgency ? ` (${it.urgency})` : ''}
                        </Text>
                      </View>
                    ))}
                    {remaining > 0 && (
                      <Text style={styles.moreTxt}>+{remaining} more…</Text>
                    )}
                  </View>
                )}
                <View style={styles.cardFoot}>
                  <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                  <Text style={styles.cardFootTxt}>{formatDate(p.created_at)}</Text>
                </View>
              </View>
            );
          })}
          <PaginationBar page={page} totalPages={totalPages} total={plans.length} onChange={setPage} />
        </>
      )}
    </View>
  );
}

// ─── 2. Consultation History ─────────────────────────────────────────────────
function ConsultationsSection({
  visits, onStart, onOpen, onEdit, onBookFollowUp,
}: {
  visits: ClinicalVisit[];
  onStart: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onBookFollowUp: (visitId: string, reviewDate: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(visits.length / PAGE_SIZE));
  const view = useMemo(
    () => visits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visits, page],
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View>
      <SectionHeader
        icon="reader"
        iconColor="#15803D"
        title="Consultation History"
        count={visits.length}
        addLabel="Start Consultation"
        onAdd={onStart}
      />
      {visits.length === 0 ? (
        <EmptyMini label="No consultations yet" />
      ) : (
        <>
          {view.map((v) => {
            const st = visitStatusStyle(v.status);
            const isExpanded = expanded.has(v.id);
            const reviewDays = daysUntil(v.review_date);
            const showFollowUpWarning = reviewDays !== null && reviewDays <= 3;
            return (
              <View key={v.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: st.accent }]}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {v.chief_complaint || 'Consultation'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillTxt, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.cardFoot}>
                  <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                  <Text style={styles.cardFootTxt}>{formatDate(v.visit_date ?? v.created_at)}</Text>
                  {v.dentist?.name && (
                    <>
                      <Text style={{ color: '#cbd5e1' }}>·</Text>
                      <Ionicons name="person-outline" size={11} color="#94a3b8" />
                      <Text style={styles.cardFootTxt}>{v.dentist.name}</Text>
                    </>
                  )}
                </View>

                {v.diagnosis_summary && (
                  <View style={styles.diagBox}>
                    <Text style={styles.diagTxt} numberOfLines={isExpanded ? undefined : 2}>{v.diagnosis_summary}</Text>
                  </View>
                )}

                {showFollowUpWarning && (
                  <View style={styles.warnBox}>
                    <Ionicons name="alert-circle" size={14} color="#B45309" />
                    <Text style={styles.warnTxt}>
                      {reviewDays! < 0 ? 'Review overdue' : `Review due in ${reviewDays}d`}
                    </Text>
                  </View>
                )}

                {isExpanded && (
                  <View style={styles.expandBox}>
                    {v.finalized_at && (
                      <Text style={styles.expandTxt}>
                        Finalized · {formatDate(v.finalized_at)}
                      </Text>
                    )}
                    {v.review_date && (
                      <Text style={styles.expandTxt}>
                        Review after · {formatDate(v.review_date)}
                      </Text>
                    )}
                    {showFollowUpWarning && reviewDays !== null && reviewDays <= 0 && (
                      <TouchableOpacity
                        style={styles.expandBtn}
                        onPress={() => onBookFollowUp(v.id, v.review_date!)}
                      >
                        <Ionicons name="calendar" size={12} color="#4361EE" />
                        <Text style={styles.expandBtnTxt}>Book Follow-up Appointment</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Action row */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtnGhost}
                    onPress={() => toggleExpand(v.id)}
                  >
                    <Text style={styles.actionBtnGhostTxt}>
                      {isExpanded ? 'Less' : 'More details'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color="#4361EE"
                    />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={styles.iconAction} onPress={() => onEdit(v.id)}>
                    <Ionicons name="pencil" size={13} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconAction} onPress={() => onOpen(v.id)}>
                    <Ionicons name="arrow-forward" size={13} color="#4361EE" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <PaginationBar page={page} totalPages={totalPages} total={visits.length} onChange={setPage} />
        </>
      )}
    </View>
  );
}

// ─── 3. Prescriptions ────────────────────────────────────────────────────────
function PrescriptionsSection({
  prescriptions, onAdd, onOpen,
}: {
  prescriptions: Prescription[];
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(prescriptions.length / PAGE_SIZE));
  const view = useMemo(
    () => prescriptions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [prescriptions, page],
  );

  return (
    <View>
      <SectionHeader
        icon="pulse"
        iconColor="#B45309"
        title="Prescriptions"
        count={prescriptions.length}
        addLabel="New Prescription"
        onAdd={onAdd}
      />
      {prescriptions.length === 0 ? (
        <EmptyMini label="No prescriptions yet" />
      ) : (
        <>
          {view.map((rx) => {
            const meds = rx.items ?? [];
            const shown = meds.slice(0, 3);
            const remaining = Math.max(0, meds.length - shown.length);
            return (
              <TouchableOpacity
                key={rx.id}
                style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#2563EB' }]}
                activeOpacity={0.8}
                onPress={() => onOpen(rx.id)}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {rx.diagnosis || 'Prescription'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.statusPillTxt, { color: '#B45309' }]}>
                      {meds.length} med{meds.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
                <View style={styles.medRow}>
                  {shown.map((m, i) => (
                    <View key={m.id ?? i} style={styles.medPill}>
                      <Text style={styles.medPillTxt} numberOfLines={1}>{m.drug_name}</Text>
                    </View>
                  ))}
                  {remaining > 0 && (
                    <View style={[styles.medPill, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.medPillTxt, { color: '#64748b' }]}>+{remaining} more</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardFoot}>
                  <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                  <Text style={styles.cardFootTxt}>{formatDate(rx.created_at)}</Text>
                  {rx.dentist?.name && (
                    <>
                      <Text style={{ color: '#cbd5e1' }}>·</Text>
                      <Text style={styles.cardFootTxt}>{rx.dentist.name}</Text>
                    </>
                  )}
                </View>
                <View style={styles.viewLink}>
                  <Text style={styles.viewLinkTxt}>View prescription</Text>
                  <Ionicons name="arrow-forward" size={12} color="#4361EE" />
                </View>
              </TouchableOpacity>
            );
          })}
          <PaginationBar page={page} totalPages={totalPages} total={prescriptions.length} onChange={setPage} />
        </>
      )}
    </View>
  );
}

// ─── 4. Treatments ───────────────────────────────────────────────────────────
function TreatmentsSection({
  treatments, onAdd, onOpen,
}: {
  treatments: Treatment[];
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(treatments.length / PAGE_SIZE));
  const view = useMemo(
    () => treatments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [treatments, page],
  );

  return (
    <View>
      <SectionHeader
        icon="medical"
        iconColor="#0369A1"
        title="Treatments"
        count={treatments.length}
        addLabel="New Treatment"
        onAdd={onAdd}
      />
      {treatments.length === 0 ? (
        <EmptyMini label="No treatments yet" />
      ) : (
        <>
          {view.map((t) => {
            const st = treatmentStatusStyle(t.status);
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.card, { borderLeftWidth: 3, borderLeftColor: st.accent }]}
                activeOpacity={0.8}
                onPress={() => onOpen(t.id)}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{t.procedure}</Text>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillTxt, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  {t.tooth_number && (
                    <View style={[styles.metaPill, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.metaPillTxt, { color: '#4F46E5' }]}>
                        Tooth #{t.tooth_number}
                      </Text>
                    </View>
                  )}
                  {t.diagnosis && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillTxt} numberOfLines={1}>{t.diagnosis}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costTxt}>{formatCurrency(Number(t.cost ?? 0))}</Text>
                  <View style={styles.viewLink}>
                    <Text style={styles.viewLinkTxt}>View</Text>
                    <Ionicons name="arrow-forward" size={12} color="#4361EE" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <PaginationBar page={page} totalPages={totalPages} total={treatments.length} onChange={setPage} />
        </>
      )}
    </View>
  );
}

function EmptyMini({ label }: { label: string }) {
  return (
    <View style={styles.emptyMini}>
      <Text style={styles.emptyMiniTxt}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  countDot: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  countDotTxt: { fontSize: 11, fontWeight: '700', color: '#475569' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#EEF2FF', borderRadius: 8,
  },
  addBtnTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillTxt: { fontSize: 10, fontWeight: '700' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F1F5F9' },
  metaPillTxt: { fontSize: 11, color: '#475569', fontWeight: '600' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94a3b8' },
  itemTxt: { flex: 1, fontSize: 12, color: '#475569' },
  moreTxt: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginLeft: 10 },

  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardFootTxt: { fontSize: 11, color: '#64748b' },

  diagBox: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 },
  diagTxt: { fontSize: 12, color: '#475569', lineHeight: 18 },

  warnBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  warnTxt: { fontSize: 11, color: '#B45309', fontWeight: '700' },

  expandBox: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, gap: 6 },
  expandTxt: { fontSize: 12, color: '#475569' },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: '#EEF2FF', borderRadius: 8, alignSelf: 'flex-start',
  },
  expandBtnTxt: { fontSize: 12, color: '#4361EE', fontWeight: '700' },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  actionBtnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 4,
  },
  actionBtnGhostTxt: { fontSize: 12, color: '#4361EE', fontWeight: '600' },
  iconAction: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },

  medRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  medPill: {
    backgroundColor: '#DBEAFE', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
    maxWidth: '60%',
  },
  medPillTxt: { fontSize: 11, color: '#2563EB', fontWeight: '600' },

  viewLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  viewLinkTxt: { fontSize: 12, color: '#4361EE', fontWeight: '700' },

  costRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  costTxt: { fontSize: 15, fontWeight: '800', color: '#0f172a' },

  emptyMini: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  emptyMiniTxt: { fontSize: 12, color: '#94a3b8' },

  pag: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingVertical: 6, marginTop: 4,
  },
  pagTxt: { fontSize: 12, color: '#64748b' },
  pagBold: { fontWeight: '700', color: '#0f172a' },
  pagBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pagBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  pagBtnDisabled: { backgroundColor: '#F8FAFC' },
  pagIndicator: {
    paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
  },
  pagIndicatorTxt: { fontSize: 11, color: '#475569', fontWeight: '600' },
});
