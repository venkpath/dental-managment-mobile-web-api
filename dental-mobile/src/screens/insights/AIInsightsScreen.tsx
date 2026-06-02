import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
import EmptyState from '../../components/EmptyState';
import { radius, shadow } from '../../theme';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE',
  indigoLight: '#EEF2FF',
  violet: '#7C3AED',
  violetLight: '#EDE9FE',
  violetBorder: '#DDD6FE',
  bg: '#F8FAFC',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#475569',
  textMuted: '#94a3b8',
  border: '#E2E8F0',
  red: '#dc2626',
  redLight: '#FEE2E2',
  amber: '#d97706',
  amberLight: '#FEF3C7',
  green: '#059669',
  greenLight: '#DCFCE7',
};

const TABS: {
  key: InsightListType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  dot: string;
  blurb: string;
}[] = [
  { key: 'no_show', label: 'No-show', icon: 'alert-circle-outline', dot: C.red, blurb: 'Likely to miss upcoming visits' },
  { key: 'recall', label: 'Recall', icon: 'alarm-outline', dot: C.amber, blurb: 'Overdue for hygiene or check-up' },
  { key: 'churn', label: 'Churn', icon: 'trending-down-outline', dot: C.violet, blurb: 'At risk of leaving the practice' },
  { key: 'conversion', label: 'Conversion', icon: 'trending-up-outline', dot: C.green, blurb: 'High potential for treatment acceptance' },
];

function patientName(row: InsightPatientRow): string {
  const p = row.patient;
  if (p) return `${p.first_name} ${p.last_name}`.trim();
  return 'Patient';
}

function riskMeta(
  row: InsightPatientRow,
  type: InsightListType,
): { label: string; bg: string; fg: string } {
  if (type === 'no_show') {
    const level = (row.no_show_risk ?? '').toLowerCase();
    if (level === 'high') return { label: `High · ${row.no_show_score ?? 0}`, bg: C.redLight, fg: C.red };
    if (level === 'medium') return { label: `Medium · ${row.no_show_score ?? 0}`, bg: C.amberLight, fg: C.amber };
    return { label: `${row.no_show_risk ?? 'Risk'} · ${row.no_show_score ?? 0}`, bg: C.indigoLight, fg: C.indigo };
  }
  if (type === 'churn') {
    const level = (row.churn_risk ?? '').toLowerCase();
    if (level === 'high') return { label: `High · ${row.churn_score ?? 0}`, bg: C.redLight, fg: C.red };
    if (level === 'medium') return { label: `Medium · ${row.churn_score ?? 0}`, bg: C.amberLight, fg: C.amber };
    return { label: `${row.churn_risk ?? 'Risk'} · ${row.churn_score ?? 0}`, bg: C.violetLight, fg: C.violet };
  }
  if (type === 'recall') {
    const days = row.recall_due_days ?? 0;
    const overdue = days > 0;
    return {
      label: overdue ? `Overdue ${days}d` : row.recall_due ? 'Due now' : 'Recall',
      bg: overdue ? C.redLight : C.amberLight,
      fg: overdue ? C.red : C.amber,
    };
  }
  return {
    label: `Score ${row.conversion_score ?? 0}`,
    bg: C.greenLight,
    fg: C.green,
  };
}

function tabCount(summary: InsightSummary | null, type: InsightListType): number {
  if (!summary) return 0;
  switch (type) {
    case 'no_show':
      return summary.no_show?.total ?? 0;
    case 'recall':
      return summary.recall?.total ?? 0;
    case 'churn':
      return summary.churn?.total ?? 0;
    case 'conversion':
      return summary.conversion?.total ?? 0;
    default:
      return 0;
  }
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [computing, setComputing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadSummary = useCallback(async () => {
    const sum = await insightsService.getSummary();
    setSummary(sum);
    return sum;
  }, []);

  const loadList = useCallback(async (type: InsightListType, quiet = false) => {
    if (!quiet) setListLoading(true);
    try {
      const list = await insightsService.getList({ type, limit: 50, offset: 0 });
      setRows(list.data ?? []);
      setTotal(list.total ?? 0);
      setLoadError(false);
    } catch {
      setRows([]);
      setTotal(0);
      setLoadError(true);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadAll = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setInitialLoading(true);
      try {
        await Promise.all([loadSummary(), loadList(tab, true)]);
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [loadSummary, loadList, tab],
  );

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  useEffect(() => {
    if (!initialLoading) {
      loadList(tab);
    }
  }, [tab, initialLoading, loadList]);

  const onTabChange = (key: InsightListType) => {
    if (key !== tab) setTab(key);
  };

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
            await loadAll(true);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Compute failed');
          } finally {
            setComputing(false);
          }
        },
      },
    ]);
  };

  const openPatient = (row: InsightPatientRow) => {
    const id = row.patient?.id ?? row.patient_id;
    if (!id) return;
    navigation.getParent()?.navigate('Patients', {
      screen: 'PatientDetail',
      params: { patientId: id },
    } as never);
  };

  const activeTab = TABS.find((t) => t.key === tab)!;
  const atRisk = summary?.total_at_risk ?? 0;
  const recallTotal = summary?.recall?.total ?? 0;
  const churnTotal = summary?.churn?.total ?? 0;
  const potential = summary?.conversion?.potential_revenue ?? 0;

  const renderPatient = ({ item }: { item: InsightPatientRow }) => {
    const risk = riskMeta(item, tab);
    const initials = patientName(item)
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={() => openPatient(item)}>
        <View style={[s.avatar, { backgroundColor: risk.bg }]}>
          <Text style={[s.avatarTxt, { color: risk.fg }]}>{initials || '?'}</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.patientName} numberOfLines={1}>
            {patientName(item)}
          </Text>
          {item.patient?.phone ? (
            <Text style={s.patientPhone} numberOfLines={1}>
              {item.patient.phone}
            </Text>
          ) : null}
        </View>
        <View style={[s.riskPill, { backgroundColor: risk.bg }]}>
          <Text style={[s.riskPillTxt, { color: risk.fg }]} numberOfLines={1}>
            {risk.label}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </TouchableOpacity>
    );
  };

  const summaryCard = (
    <View style={s.summaryWrap}>
      <View style={s.aiCard}>
        <View style={s.aiHeader}>
          <View style={s.aiTitleRow}>
            <Ionicons name="sparkles" size={16} color={C.violet} />
            <Text style={s.aiTitle}>Clinic overview</Text>
          </View>
          {summary?.confidence_score != null && (
            <View style={s.confidencePill}>
              <Text style={s.confidenceTxt}>{Math.round(summary.confidence_score)}% confidence</Text>
            </View>
          )}
        </View>

        <View style={s.metricsRow}>
          {[
            { icon: 'people' as const, color: C.red, label: 'At risk', value: String(atRisk) },
            { icon: 'alarm' as const, color: C.amber, label: 'Recall due', value: String(recallTotal) },
            { icon: 'trending-down' as const, color: C.violet, label: 'Churn', value: String(churnTotal) },
            {
              icon: 'cash' as const,
              color: C.green,
              label: 'Potential',
              value: formatCurrency(potential),
              small: true,
            },
          ].map((m) => (
            <View key={m.label} style={s.metric}>
              <View style={s.metricTop}>
                <Ionicons name={m.icon} size={14} color={m.color} />
              </View>
              <Text
                style={[s.metricValue, m.small && s.metricValueSmall]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {m.value}
              </Text>
              <Text style={s.metricLabel} numberOfLines={2}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        {summary?.last_computed_at ? (
          <Text style={s.computedAt}>
            Updated {new Date(summary.last_computed_at).toLocaleString()}
          </Text>
        ) : (
          <Text style={s.computedAt}>Not computed yet — run insights below</Text>
        )}

        <TouchableOpacity style={s.computeBtn} onPress={onCompute} disabled={computing} activeOpacity={0.85}>
          {computing ? (
            <ActivityIndicator color={C.indigo} size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={C.indigo} />
              <Text style={s.computeTxt}>Recompute insights</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <View style={s.titleRow}>
            <Text style={s.title}>AI Insights</Text>
            <LinearGradient colors={['#7C3AED', '#4361EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.beta}>
              <Text style={s.betaTxt}>BETA</Text>
            </LinearGradient>
          </View>
          <Text style={s.subtitle}>Patient risk scores & opportunities</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      {initialLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.indigo} />
          <Text style={s.loadingHint}>Loading insights…</Text>
        </View>
      ) : (
        <>
          {summaryCard}

          {/* Segment tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.filtersRow}
            contentContainerStyle={s.filtersContent}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              const count = tabCount(summary, t.key);
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.filterTab, active && s.filterTabActive]}
                  onPress={() => onTabChange(t.key)}
                  activeOpacity={0.7}
                >
                  {!active && <View style={[s.filterDot, { backgroundColor: t.dot }]} />}
                  <Text style={[s.filterTabText, active && s.filterTabTextActive]}>
                    {t.label}
                    {count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>{activeTab.label} patients</Text>
            <Text style={s.sectionSub} numberOfLines={2}>
              {activeTab.blurb}
              {total > 0 ? ` · ${total} listed` : ''}
            </Text>
          </View>

          <View style={s.listWrap}>
            {listLoading && (
              <View style={s.listOverlay}>
                <ActivityIndicator size="small" color={C.indigo} />
              </View>
            )}
            <FlatList
              data={rows}
              keyExtractor={(item) => item.patient_id}
              renderItem={renderPatient}
              style={{ flex: 1 }}
              contentContainerStyle={[
                s.list,
                rows.length === 0 && s.listEmpty,
                { paddingBottom: 16 + bottomInset },
              ]}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} colors={[C.indigo]} />
              }
              ListEmptyComponent={
                loadError ? (
                  <EmptyState title="Could not load list" subtitle="Pull down to retry" icon="alert-circle" />
                ) : (
                  <EmptyState
                    title={`No ${activeTab.label.toLowerCase()} patients`}
                    subtitle="Run recompute or check back after more visit data is recorded."
                    icon="sparkles"
                  />
                )
              }
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
            />
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingHint: { fontSize: 13, color: C.textMuted },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: C.bg,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  beta: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  betaTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 2 },

  summaryWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  aiCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.violetBorder,
    ...shadow.sm,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  aiTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  confidencePill: {
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.violetBorder,
  },
  confidenceTxt: { fontSize: 10, fontWeight: '600', color: C.violet },

  metricsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  metric: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 10,
    gap: 2,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center' },
  metricValue: { fontSize: 15, fontWeight: '800', color: C.text },
  metricValueSmall: { fontSize: 11 },
  metricLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', lineHeight: 12 },

  computedAt: { fontSize: 11, color: C.textMuted, marginBottom: 10 },
  computeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.indigo,
  },
  computeTxt: { fontSize: 13, fontWeight: '700', color: C.indigo },

  filtersRow: { flexGrow: 0, backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: C.bg,
    gap: 5,
  },
  filterTabActive: { backgroundColor: C.indigo },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterTabText: { fontSize: 13, fontWeight: '500', color: C.textSub },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },

  sectionHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  sectionSub: { fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 17 },

  listWrap: { flex: 1, position: 'relative' },
  listOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,250,252,0.6)',
    zIndex: 2,
  },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  listEmpty: { flexGrow: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 14, fontWeight: '800' },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  patientName: { fontSize: 15, fontWeight: '800', color: C.text },
  patientPhone: { fontSize: 12, color: C.textMuted },
  riskPill: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  riskPillTxt: { fontSize: 10, fontWeight: '700' },
});
