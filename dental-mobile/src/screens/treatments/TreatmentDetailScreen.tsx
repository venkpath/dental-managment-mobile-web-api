import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { treatmentService } from '../../services/treatment.service';
import { formatCurrency, getLocale } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import { normalizeTreatmentStatus, treatmentStatusMeta } from '../../utils/treatmentStatus';
import type { Treatment, TreatmentStatus, BillingStackParamList, PatientStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList & PatientStackParamList, 'TreatmentDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList & PatientStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6', grayLight: '#f1f5f9',
};

function nextStatusActions(current: TreatmentStatus) {
  switch (current) {
    case 'planned':
      return [
        { status: 'in_progress' as const, label: 'Start', icon: 'play-outline' as const, color: C.amber, bg: C.amberLight },
        { status: 'completed' as const, label: 'Complete', icon: 'checkmark-circle-outline' as const, color: C.green, bg: C.greenLight },
      ];
    case 'in_progress':
      return [
        { status: 'completed' as const, label: 'Complete', icon: 'checkmark-circle-outline' as const, color: C.green, bg: C.greenLight },
      ];
    default:
      return [];
  }
}

export default function TreatmentDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { treatmentId } = route.params;

  const [tx, setTx] = useState<Treatment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    treatmentService.get(treatmentId)
      .then((t) => { setTx(t); setLoadError(false); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [treatmentId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const setStatus = (status: TreatmentStatus) => {
    Alert.alert('Update status', `Change status to "${statusMeta(status).label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setUpdating(true);
          try {
            const updated = await treatmentService.update(treatmentId, { status });
            setTx(updated);
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const goEdit = () => {
    navigation.navigate('EditTreatment', { treatmentId });
  };

  const Header = (
    <View style={[s.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <View style={s.hTitleBlock}>
        <Text style={s.hTitle}>Treatment</Text>
        {tx && <Text style={s.hSub} numberOfLines={1}>{tx.procedure}</Text>}
      </View>
      {tx && (
        <TouchableOpacity onPress={goEdit} style={s.hBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={20} color={C.indigo} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  if (!tx) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
          <Text style={s.errText}>{loadError ? 'Failed to load treatment.' : 'Treatment not found.'}</Text>
        </View>
      </View>
    );
  }

  const normalizedStatus = normalizeTreatmentStatus(tx.status);
  const sm = treatmentStatusMeta(tx.status);
  const nextActions = nextStatusActions(normalizedStatus);

  return (
    <View style={s.screen}>
      {Header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: 24 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.heroRow}>
            <View style={[s.iconBox, { backgroundColor: sm.bg }]}>
              <Ionicons name="medkit" size={24} color={sm.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.procedure}>{tx.procedure}</Text>
              <View style={[s.statusPill, { backgroundColor: sm.bg, alignSelf: 'flex-start', marginTop: 6 }]}>
                <Text style={[s.statusPillTxt, { color: sm.fg }]}>{sm.label}</Text>
              </View>
            </View>
            <Text style={s.cost}>{formatCurrency(Number(tx.cost))}</Text>
          </View>
          <Text style={s.dateText}>
            Recorded {new Date(tx.created_at).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.fieldLabel}>PATIENT</Text>
          <Text style={s.partyName}>{tx.patient.first_name} {tx.patient.last_name}</Text>
          <View style={s.twoCol}>
            <View style={s.colHalf}>
              <Text style={s.fieldLabel}>DOCTOR</Text>
              <Text style={s.colValue}>Dr. {tx.dentist.name}</Text>
            </View>
            <View style={s.colHalf}>
              <Text style={s.fieldLabel}>BRANCH</Text>
              <Text style={s.colValue}>{tx.branch?.name ?? '—'}</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.sectionHead}>
            <Ionicons name="clipboard-outline" size={18} color={C.indigo} />
            <Text style={s.sectionTitle}>Clinical</Text>
          </View>
          {tx.tooth_number ? (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Tooth</Text>
              <Text style={s.infoValue}>#{tx.tooth_number}</Text>
            </View>
          ) : null}
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Diagnosis</Text>
            <Text style={[s.infoValue, { flex: 1 }]}>{tx.diagnosis}</Text>
          </View>
          {tx.notes ? (
            <View style={s.noteBlock}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textMuted} />
              <Text style={s.noteValue}>{tx.notes}</Text>
            </View>
          ) : null}
        </View>

        {nextActions.length > 0 && (
          <View style={s.actionsRow}>
            {nextActions.map((a) => (
              <TouchableOpacity
                key={a.status}
                style={s.actionCard}
                onPress={() => setStatus(a.status)}
                disabled={updating}
                activeOpacity={0.7}
              >
                <View style={[s.actionIconWrap, { backgroundColor: a.bg }]}>
                  {updating ? <ActivityIndicator size="small" color={a.color} /> : <Ionicons name={a.icon} size={22} color={a.color} />}
                </View>
                <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={s.editBtn} onPress={goEdit} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={s.editBtnTxt}>Edit Treatment</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errText: { fontSize: 14, color: C.textSub },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  hBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hTitleBlock: { flex: 1, paddingHorizontal: 4 },
  hTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  hSub: { fontSize: 11, color: C.textSub, marginTop: 1 },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  procedure: { fontSize: 18, fontWeight: '800', color: C.text },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  cost: { fontSize: 20, fontWeight: '800', color: C.text },
  dateText: { fontSize: 12, color: C.textMuted, marginTop: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6 },
  partyName: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 3 },
  twoCol: { flexDirection: 'row', gap: 12, marginTop: 14 },
  colHalf: { flex: 1 },
  colValue: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, width: 72 },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.text },
  noteBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4, backgroundColor: C.bg, borderRadius: 8, padding: 10 },
  noteValue: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14, shadowColor: C.indigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  editBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
