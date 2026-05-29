import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { membershipsService, type MembershipEnrollment } from '../../services/memberships.service';
import { formatCurrency, getLocale } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'MembershipEnrollmentDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  red: '#dc2626', redLight: '#fee2e2',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6',
};

function statusStyle(s?: string) {
  switch (s) {
    case 'active': return { bg: C.greenLight, fg: C.green, label: 'Active' };
    case 'expired': return { bg: C.amberLight, fg: C.amber, label: 'Expired' };
    case 'cancelled': return { bg: C.redLight, fg: C.red, label: 'Cancelled' };
    case 'paused': return { bg: '#f1f5f9', fg: C.textMuted, label: 'Paused' };
    default: return { bg: C.indigoLight, fg: C.indigo, label: s ?? '—' };
  }
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso.includes('T') ? iso : `${iso}T12:00:00`).toLocaleDateString(getLocale(), {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function MembershipEnrollmentDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { enrollmentId } = route.params;

  const [enrollment, setEnrollment] = useState<MembershipEnrollment | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    membershipsService.getEnrollment(enrollmentId)
      .then(setEnrollment)
      .finally(() => setLoading(false));
  }, [enrollmentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  if (!enrollment) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Header onBack={() => navigation.goBack()} title="Enrollment" />
        <View style={s.center}><Text style={s.muted}>Enrollment not found</Text></View>
      </View>
    );
  }

  const st = statusStyle(enrollment.status);
  const patient = enrollment.primary_patient;
  const usages = enrollment.usages ?? enrollment.recent_usages ?? [];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <Header onBack={() => navigation.goBack()} title="Enrollment" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + bottomInset }]} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.heroRow}>
            <View style={[s.pill, { backgroundColor: st.bg }]}>
              <Text style={[s.pillTxt, { color: st.fg }]}>{st.label}</Text>
            </View>
            {enrollment.enrollment_number ? (
              <Text style={s.enrollNo}>#{enrollment.enrollment_number}</Text>
            ) : null}
          </View>
          <Text style={s.patientName}>
            {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
          </Text>
          {patient?.phone ? <Text style={s.phone}>{patient.phone}</Text> : null}
          <Text style={s.planName}>{enrollment.membership_plan?.name ?? 'Membership plan'}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Validity</Text>
          <Row label="Start" value={fmtDate(enrollment.start_date)} />
          <Row label="End" value={fmtDate(enrollment.end_date)} />
          <Row label="Branch" value={enrollment.branch?.name ?? '—'} />
          <Row label="Amount paid" value={formatCurrency(Number(enrollment.amount_paid ?? 0))} />
        </View>

        {(enrollment.members ?? []).length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Covered members</Text>
            {(enrollment.members ?? []).map((m, i) => (
              <View key={m.id ?? m.patient_id} style={[s.memberRow, i > 0 && s.borderTop]}>
                <Text style={s.memberName}>
                  {m.patient ? `${m.patient.first_name} ${m.patient.last_name}` : 'Member'}
                  {m.is_primary ? ' (Primary)' : ''}
                </Text>
                {m.relation_label ? <Text style={s.memberRel}>{m.relation_label}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {enrollment.notes ? (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Notes</Text>
            <Text style={s.noteTxt}>{enrollment.notes}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.sectionLabel}>Recent usage ({usages.length})</Text>
          {usages.length === 0 ? (
            <Text style={s.muted}>No benefit usage recorded yet</Text>
          ) : (
            usages.slice(0, 10).map((u, i) => (
              <View key={u.id ?? i} style={[s.usageRow, i > 0 && s.borderTop]}>
                <Text style={s.usageTitle}>{u.benefit?.title ?? u.benefit_title ?? 'Benefit'}</Text>
                <Text style={s.usageMeta}>
                  {fmtDate(u.used_on ?? u.used_at)}
                  {u.discount_applied ? ` · ${formatCurrency(Number(u.discount_applied))}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => navigation.navigate('EditMembershipEnrollment', { enrollmentId })}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={s.editTxt}>Edit enrollment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={s.topbar}>
      <TouchableOpacity onPress={onBack} style={s.iconBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={C.text} />
      </TouchableOpacity>
      <Text style={s.topTitle}>{title}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLbl}>{label}</Text>
      <Text style={s.rowVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 13, color: C.textMuted },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillTxt: { fontSize: 11, fontWeight: '700' },
  enrollNo: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  patientName: { fontSize: 20, fontWeight: '800', color: C.text },
  phone: { fontSize: 14, color: C.indigo, fontWeight: '600', marginTop: 4 },
  planName: { fontSize: 14, color: C.textSub, marginTop: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLbl: { fontSize: 14, color: C.textSub },
  rowVal: { fontSize: 14, fontWeight: '700', color: C.text },
  memberRow: { paddingVertical: 8 },
  borderTop: { borderTopWidth: 1, borderTopColor: C.divider },
  memberName: { fontSize: 14, fontWeight: '700', color: C.text },
  memberRel: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  noteTxt: { fontSize: 14, color: C.text, lineHeight: 20 },
  usageRow: { paddingVertical: 8 },
  usageTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  usageMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14,
  },
  editTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
