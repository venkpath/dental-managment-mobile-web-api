import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  insightsService,
  type InsightSummary,
  type InsightListType,
  type InsightPatientRow,
} from '../../services/insights.service';
import { formatCurrency } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF', violet: '#7C3AED', violetLight: '#EDE9FE',
  bg: '#F8FAFC', surface: '#ffffff', text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', red: '#dc2626', amber: '#d97706', green: '#059669',
};

const TABS: { key: InsightListType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'no_show', label: 'No-show', icon: 'alert-circle-outline' },
  { key: 'recall', label: 'Recall', icon: 'alarm-outline' },
  { key: 'churn', label: 'Churn', icon: 'trending-down-outline' },
  { key: 'conversion', label: 'Conversion', icon: 'trending-up-outline' },
];

function patientName(row: InsightPatientRow): string {
  const p = row.patient;
  if (p) return `${p.first_name} ${p.last_name}`.trim();
  return 'Patient';
}

function riskLabel(row: InsightPatientRow, type: InsightListType): string {
  if (type === 'no_show') return `${row.no_show_risk ?? '—'} (${row.no_show_score ?? 0})`;
  if (type === 'churn') return `${row.churn_risk ?? '—'} (${row.churn_score ?? 0})`;
  if (type === 'recall') return row.recall_due ? `Due ${row.recall_due_days ?? 0}d` : 'Due';
  return `Score ${row.conversion_score ?? 0}`;
}

export default function AIInsightsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [tab, setTab] = useState<InsightListType>('no_show');
  const [rows, setRows] = useState<InsightPatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [computing, setComputing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [sum, list] = await Promise.all([
        insightsService.getSummary(),
        insightsService.getList({ type: tab, limit: 30, offset: 0 }),
      ]);
      setSummary(sum);
      setRows(list.data ?? []);
      setTotal(list.total ?? 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onCompute = () => {
    Alert.alert('Recompute insights', 'This may take a minute for large clinics.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Run',
        onPress: async () => {
          setComputing(true);
          try {
            await insightsService.compute();
            Alert.alert('Started', 'Insight computation has been queued.');
            load(true);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Compute failed');
          } finally {
            setComputing(false);
          }
        },
      },
    ]);
  };

  const renderPatient = ({ item }: { item: InsightPatientRow }) => (
    <TouchableOpacity
      style={s.patientCard}
      activeOpacity={0.75}
      onPress={() => {
        const id = item.patient?.id ?? item.patient_id;
        if (id) {
          navigation.getParent()?.navigate('Patients', {
            screen: 'PatientDetail',
            params: { patientId: id },
          } as never);
        }
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.patientName}>{patientName(item)}</Text>
        {item.patient?.phone && <Text style={s.patientPhone}>{item.patient.phone}</Text>}
      </View>
      <Text style={s.riskTxt}>{riskLabel(item, tab)}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Ionicons name="sparkles" size={18} color={C.violet} />
            <Text style={s.title}>AI Insights</Text>
            <View style={s.beta}><Text style={s.betaTxt}>BETA</Text></View>
          </View>
          <Text style={s.subtitle}>Patient risk & opportunities</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabStrip}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabOn]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={14} color={tab === t.key ? C.indigo : C.textMuted} />
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.patient_id}
          renderItem={renderPatient}
          contentContainerStyle={[s.list, { paddingBottom: 16 + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.indigo]} />}
          ListHeaderComponent={
            <View style={s.summaryBlock}>
              <View style={s.metricGrid}>
                {[
                  { label: 'At risk', value: summary?.total_at_risk ?? 0, color: C.red },
                  { label: 'Recall due', value: summary?.recall.total ?? 0, color: C.amber },
                  { label: 'Churn risk', value: summary?.churn.total ?? 0, color: C.violet },
                  { label: 'Potential ₹', value: formatCurrency(summary?.conversion.potential_revenue ?? 0), color: C.green, small: true },
                ].map((m) => (
                  <View key={m.label} style={s.metricBox}>
                    <Text style={[s.metricVal, { color: m.color }, m.small && s.metricValSmall]}>{m.value}</Text>
                    <Text style={s.metricLbl}>{m.label}</Text>
                  </View>
                ))}
              </View>
              {summary?.last_computed_at && (
                <Text style={s.computedAt}>
                  Last computed {new Date(summary.last_computed_at).toLocaleString()}
                </Text>
              )}
              <TouchableOpacity style={s.computeBtn} onPress={onCompute} disabled={computing}>
                {computing ? (
                  <ActivityIndicator color={C.indigo} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color={C.indigo} />
                    <Text style={s.computeTxt}>Recompute insights</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={s.listHead}>{total} patients · {tab.replace(/_/g, ' ')}</Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={s.empty}>No patients in this segment. Run compute or check back later.</Text>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  beta: { backgroundColor: C.violetLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  betaTxt: { fontSize: 9, fontWeight: '800', color: C.violet },
  subtitle: { fontSize: 11, color: C.textSub },
  tabStrip: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  tabOn: { backgroundColor: C.indigoLight, borderColor: C.indigo },
  tabTxt: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  tabTxtOn: { color: C.indigo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16 },
  summaryBlock: { gap: 12, marginBottom: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricBox: {
    width: '47%', backgroundColor: C.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  metricVal: { fontSize: 20, fontWeight: '800' },
  metricValSmall: { fontSize: 14 },
  metricLbl: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  computedAt: { fontSize: 11, color: C.textMuted },
  computeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: 10, backgroundColor: C.indigoLight, borderRadius: 10 },
  computeTxt: { fontSize: 13, fontWeight: '600', color: C.indigo },
  listHead: { fontSize: 13, fontWeight: '700', color: C.textSub },
  patientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface,
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  patientName: { fontSize: 14, fontWeight: '700', color: C.text },
  patientPhone: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  riskTxt: { fontSize: 12, fontWeight: '600', color: C.textSub, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: C.textMuted, padding: 24, fontSize: 14 },
});
