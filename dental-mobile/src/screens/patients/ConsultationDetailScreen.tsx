import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { clinicalService, type ClinicalVisit } from '../../services/clinical.service';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'ConsultationDetail'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${formatDate(iso)} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

function statusStyle(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'finalized': return { bg: '#DCFCE7', text: '#15803D', label: 'Finalized', accent: '#15803D' };
    case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled', accent: '#DC2626' };
    default:          return { bg: '#FEF3C7', text: '#B45309', label: 'In Progress', accent: '#B45309' };
  }
}

export default function ConsultationDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { visitId, patientName } = route.params;

  const [visit, setVisit] = useState<ClinicalVisit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    clinicalService.getVisit(visitId)
      .then((v) => setVisit(v))
      .catch(() => setVisit(null))
      .finally(() => setLoading(false));
  }, [visitId]);

  if (loading) {
    return (
      <View style={[s.safe, { paddingTop: insets.top }]}>
        <TopBar onBack={() => navigation.goBack()} title="Consultation" />
        <View style={s.center}><ActivityIndicator size="large" color="#4361EE" /></View>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={[s.safe, { paddingTop: insets.top }]}>
        <TopBar onBack={() => navigation.goBack()} title="Consultation" />
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={40} color="#94a3b8" />
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
            Consultation not found
          </Text>
        </View>
      </View>
    );
  }

  const st = statusStyle(visit.status);
  const fields: Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value?: string | null; placeholder?: string }> = [
    { icon: 'flag-outline',       label: 'Chief Complaint',          value: visit.chief_complaint,         placeholder: 'Not captured' },
    { icon: 'time-outline',       label: 'Past Dental History',      value: visit.past_dental_history,     placeholder: 'No prior dental records' },
    { icon: 'alert-circle-outline', label: 'Allergies / Medical History', value: visit.medical_history_notes, placeholder: 'No known allergies' },
    { icon: 'eye-outline',        label: 'Examination Notes',        value: visit.examination_notes,       placeholder: 'No exam notes' },
    { icon: 'medkit-outline',     label: 'Clinical Diagnosis',       value: visit.diagnosis_summary,       placeholder: 'No diagnosis recorded' },
    { icon: 'document-text-outline', label: 'Treatment Plan',        value: visit.treatment_plan,          placeholder: 'No plan written' },
  ];

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <TopBar
        onBack={() => navigation.goBack()}
        title="Consultation"
        subtitle={
          patientName
            ?? (visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : undefined)
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 + bottomInset, gap: 14 }}>
        {/* Hero card */}
        <View style={[s.heroCard, { borderLeftColor: st.accent }]}>
          <View style={s.heroHeader}>
            <Text style={s.heroTitle} numberOfLines={2}>
              {visit.chief_complaint || 'Consultation'}
            </Text>
            <View style={[s.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[s.statusPillTxt, { color: st.text }]}>{st.label}</Text>
            </View>
          </View>
          <View style={s.heroMeta}>
            <View style={s.heroMetaItem}>
              <Ionicons name="calendar-outline" size={13} color="#64748b" />
              <Text style={s.heroMetaTxt}>{formatDate(visit.visit_date ?? visit.created_at)}</Text>
            </View>
            {visit.dentist?.name && (
              <View style={s.heroMetaItem}>
                <Ionicons name="person-outline" size={13} color="#64748b" />
                <Text style={s.heroMetaTxt}>{visit.dentist.name}</Text>
              </View>
            )}
            {visit.branch?.name && (
              <View style={s.heroMetaItem}>
                <Ionicons name="location-outline" size={13} color="#64748b" />
                <Text style={s.heroMetaTxt}>{visit.branch.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Fields */}
        {fields.map((f) => (
          <View key={f.label} style={s.fieldCard}>
            <View style={s.fieldHeader}>
              <Ionicons name={f.icon} size={15} color="#475569" />
              <Text style={s.fieldLabel}>{f.label}</Text>
            </View>
            <Text style={[s.fieldValue, !f.value && s.fieldEmpty]}>
              {f.value && f.value.trim().length > 0 ? f.value : f.placeholder}
            </Text>
          </View>
        ))}

        {/* Review After Date */}
        {(visit.review_date || visit.review_after_date) && (
          <View style={s.reviewCard}>
            <View style={s.reviewHeader}>
              <Ionicons name="calendar" size={15} color="#4361EE" />
              <Text style={s.reviewLabel}>Review After</Text>
            </View>
            <Text style={s.reviewDate}>{formatDate(visit.review_date ?? visit.review_after_date)}</Text>
            <TouchableOpacity
              style={s.reviewBtn}
              onPress={() =>
                navigation.getParent()?.navigate('App', {
                  screen: 'Appointments',
                  params: { screen: 'BookAppointment', params: { patientId: visit.patient_id } },
                } as never)
              }
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={13} color="#4361EE" />
              <Text style={s.reviewBtnTxt}>Book Follow-up Appointment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Finalized stamp */}
        {visit.finalized_at && (
          <View style={s.metaStamp}>
            <Ionicons name="checkmark-circle" size={14} color="#15803D" />
            <Text style={s.metaStampTxt}>Finalized · {formatDateTime(visit.finalized_at)}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[s.actionBar, { paddingBottom: 12 + bottomInset }]}>
        <TouchableOpacity
          style={s.actionGhost}
          onPress={() => navigation.navigate('StartConsultation', {
            patientId: visit.patient_id,
            patientName: patientName ?? (visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Patient'),
            visitId: visit.id,
          })}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={15} color="#4361EE" />
          <Text style={s.actionGhostTxt}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionPrimary}
          onPress={() => navigation.navigate('NewPrescription', {
            patientId: visit.patient_id,
            patientName: patientName ?? (visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Patient'),
            visitId: visit.id,
            prefillDiagnosis: visit.diagnosis_summary ?? undefined,
          })}
          activeOpacity={0.85}
        >
          <Ionicons name="pulse" size={15} color="#fff" />
          <Text style={s.actionPrimaryTxt}>Write Prescription</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TopBar({ onBack, title, subtitle }: { onBack: () => void; title: string; subtitle?: string }) {
  return (
    <View style={s.topbar}>
      <TouchableOpacity onPress={onBack} style={s.iconBtn}>
        <Ionicons name="arrow-back" size={20} color="#0f172a" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.topTitle}>{title}</Text>
        {subtitle && <Text style={s.topSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8FAFC',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  topSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },

  // Hero
  heroCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
    borderLeftWidth: 3,
    gap: 10,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  heroTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaTxt: { fontSize: 12, color: '#475569', fontWeight: '600' },

  // Field cards
  fieldCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 6,
  },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 14, color: '#0f172a', lineHeight: 21 },
  fieldEmpty: { color: '#94a3b8', fontStyle: 'italic' },

  // Review card
  reviewCard: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#C7D2FE', gap: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewLabel: { fontSize: 12, fontWeight: '700', color: '#4361EE', textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewDate: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  reviewBtnTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  // Finalized stamp
  metaStamp: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 6,
  },
  metaStampTxt: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  // Sticky actions
  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  actionGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  actionGhostTxt: { fontSize: 14, fontWeight: '700', color: '#4361EE' },
  actionPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#4361EE',
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  actionPrimaryTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
