import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { dashboardService } from '../../services/dashboard.service';
import { appointmentService } from '../../services/appointment.service';
import { insightsService, type InsightSummary as AISummary } from '../../services/insights.service';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/format';
import { shadow } from '../../theme';
import type { DashboardSummary, Appointment, PaymentBreakdown, SparklineDay } from '../../types';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';

const SW = Dimensions.get('window').width;
const CHART_H = 80;
const _d = new Date();
const TODAY = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const APPT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Confirmed', color: '#4361EE', bg: '#EEF2FF' },
  completed:  { label: 'Done',      color: '#059669', bg: '#d1fae5' },
  cancelled:  { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2' },
  no_show:    { label: 'No Show',   color: '#d97706', bg: '#fef3c7' },
};

const QUICK_ACTIONS: Array<{ label: string; icon: IoniconsName; color: string; bg: string }> = [
  { label: 'New\nAppointment', icon: 'calendar',      color: '#4361EE', bg: '#EEF2FF' },
  { label: 'Add\nPatient',     icon: 'person-add',    color: '#059669', bg: '#d1fae5' },
  { label: 'Create\nInvoice',  icon: 'document-text', color: '#0891b2', bg: '#e0f2fe' },
  { label: 'View\nReports',    icon: 'bar-chart',     color: '#d97706', bg: '#fef3c7' },
];

function BarChart({ data, period }: { data: SparklineDay[]; period: '7' | '30' }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (!data.length) {
    const placeholders = period === '7' ? 7 : 4;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 6 }}>
        {Array.from({ length: placeholders }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 20 + (i % 3) * 15, backgroundColor: '#e2e8f0', borderRadius: 6 }} />
        ))}
      </View>
    );
  }

  let pts: number[];
  let labels: string[];
  let dates: string[];

  if (period === '30') {
    // Group into 4 weekly buckets, label by the first date of each week
    const slice = data.slice(-28);
    const buckets = [0, 0, 0, 0];
    const weekStarts: string[] = ['', '', '', ''];
    slice.forEach((d, i) => {
      const wi = Math.min(3, Math.floor(i / 7));
      buckets[wi] += d.revenue;
      if (!weekStarts[wi]) weekStarts[wi] = d.date;
    });
    pts = buckets;
    labels = weekStarts.map((dt) => {
      if (!dt) return '';
      const day = new Date(dt + 'T00:00:00').getDate();
      return `${day}`;
    });
    dates = weekStarts;
  } else {
    // Last 7 actual data points — use real day names from their date strings
    const slice = data.slice(-7);
    pts = slice.map((d) => d.revenue);
    labels = slice.map((d) => {
      // Parse as local date to avoid UTC off-by-one
      const [y, m, day] = d.date.split('-').map(Number);
      return DAY_ABBR[new Date(y, m - 1, day).getDay()];
    });
    dates = slice.map((d) => d.date);
  }

  const max = Math.max(...pts, 1);
  const todayStr = TODAY;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 32, gap: 6 }}>
        {pts.map((v, i) => {
          const barH = Math.max(4, (v / max) * CHART_H);
          const isSelected = selected === i;
          const isToday = dates[i] === todayStr;
          const active = isSelected || (selected === null && isToday);
          return (
            <TouchableOpacity
              key={i}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: CHART_H + 32 }}
              activeOpacity={0.75}
              onPress={() => setSelected(isSelected ? null : i)}
            >
              {/* Tooltip */}
              {isSelected && (
                <View style={{
                  backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4,
                  position: 'absolute', top: 0, zIndex: 10,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', textAlign: 'center' }}>
                    {formatCurrency(v)}
                  </Text>
                  {/* Caret */}
                  <View style={{
                    position: 'absolute', bottom: -5, left: 0, right: 0, alignItems: 'center',
                  }}>
                    <View style={{
                      width: 0, height: 0,
                      borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 5,
                      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#1e293b',
                    }} />
                  </View>
                </View>
              )}
              <LinearGradient
                colors={active ? ['#4361EE', '#7C3AED'] : ['#c7d7ff', '#dbeafe']}
                style={{ width: '100%', height: barH, borderRadius: 6 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', paddingTop: 6 }}>
        {labels.map((l, i) => {
          const isToday = dates[i] === todayStr;
          const isSelected = selected === i;
          return (
            <Text
              key={i}
              style={{
                flex: 1, fontSize: 10, textAlign: 'center',
                color: isSelected ? '#4361EE' : isToday ? '#7C3AED' : '#94a3b8',
                fontWeight: (isSelected || isToday) ? '700' : '400',
              }}
            >{l}</Text>
          );
        })}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [summary, setSummary]         = useState<DashboardSummary | null>(null);
  const [todayAppts, setTodayAppts]   = useState<Appointment[]>([]);
  const [payments, setPayments]       = useState<PaymentBreakdown | null>(null);
  const [chartData, setChartData]     = useState<SparklineDay[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'7' | '30'>('7');
  const [insights, setInsights]       = useState<AISummary | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadError, setLoadError]     = useState(false);

  const loadData = useCallback(async (period: '7' | '30' = chartPeriod) => {
    try {
      setLoadError(false);
      const [summaryRes, apptsRes, pmts, sparklines, insightsRes] = await Promise.all([
        dashboardService.getSummary(),
        appointmentService.list({ date: TODAY, limit: 20 }),
        dashboardService.getPaymentBreakdown().catch(() => null),
        dashboardService.getSparklines(period === '7' ? 7 : 30).catch(() => ({ daily: [] as SparklineDay[] })),
        insightsService.getSummary().catch(() => null),
      ]);
      setSummary(summaryRes);
      const apptList: Appointment[] = Array.isArray(apptsRes)
        ? apptsRes
        : ((apptsRes as any)?.data ?? []);
      setTodayAppts(apptList.slice(0, 8));
      setPayments(pmts);
      setChartData(sparklines.daily);
      setInsights(insightsRes);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chartPeriod]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const switchPeriod = async (p: '7' | '30') => {
    setChartPeriod(p);
    setChartData([]);
    const sparklines = await dashboardService.getSparklines(p === '7' ? 7 : 30);
    setChartData(sparklines.daily);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const rawName   = user?.name ?? 'Doctor';
  const cleanName = rawName.replace(/^Dr\.?\s*/i, '').trim();
  const firstName = cleanName.split(' ')[0] || 'Doctor';

  const overviewCards: Array<{ label: string; icon: IoniconsName; value: string | null }> = [
    { label: 'Appointments',        icon: 'calendar',     value: loading ? null : String(todayAppts.length) },
    { label: 'New Patients\nThis Month', icon: 'people',  value: loading ? null : String(summary?.new_patients_this_month ?? 0) },
    { label: "Today's\nCollection", icon: 'cash',         value: loading ? null : formatCurrency(summary?.today_revenue ?? 0) },
    { label: 'Outstanding',         icon: 'alert-circle', value: loading ? null : formatCurrency(summary?.outstanding_amount ?? 0) },
  ];

  const chartTotal = chartPeriod === '7'
    ? chartData.slice(-7).reduce((s, d) => s + d.revenue, 0)
    : chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <View style={s.screen}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <TouchableOpacity style={s.menuBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={s.greetBlock}>
            <Text style={s.greetSub}>{greeting()},</Text>
            <Text style={s.greetName}>Dr. {firstName} 👋</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color="#0f172a" />
              <View style={s.bellBadge}><Text style={s.bellBadgeTxt}>3</Text></View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.avatarWrap}>
              <LinearGradient colors={['#4361EE', '#7C3AED']} style={s.avatarGrad}>
                <Ionicons name="medical" size={18} color="#fff" />
              </LinearGradient>
              <View style={s.onlineDot} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 20 + bottomInset }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4361EE" />}
        showsVerticalScrollIndicator={false}
      >
        {loadError && (
          <TouchableOpacity onPress={() => { setLoading(true); loadData(); }} style={s.errorBanner}>
            <Ionicons name="alert-circle" size={15} color="#991b1b" />
            <Text style={s.errorTxt}>Couldn't load data. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* ── Today's Overview ── */}
        <View style={s.pad}>
          <LinearGradient colors={['#4361EE', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.overviewCard}>
            <View style={s.overviewHeader}>
              <Text style={s.overviewTitle}>Overview</Text>
              <TouchableOpacity style={s.viewAllBtn}>
                <Text style={s.viewAllTxt}>View all</Text>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
            <View style={s.overviewGrid}>
              {overviewCards.map((c) => (
                <View key={c.label} style={s.overviewItem}>
                  <View style={s.overviewIconBox}>
                    <Ionicons name={c.icon} size={20} color="#fff" />
                  </View>
                  {c.value === null
                    ? <View style={s.ovSkeleton} />
                    : <Text style={s.overviewValue} numberOfLines={1} adjustsFontSizeToFit>{c.value}</Text>
                  }
                  <Text style={s.overviewLabel} numberOfLines={2}>{c.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* ── AI Clinic Insights ── */}
        <View style={s.pad}>
          <View style={s.aiCard}>
            {/* Header */}
            <View style={s.aiHeader}>
              <View style={s.aiTitleRow}>
                <Ionicons name="sparkles" size={16} color="#7C3AED" />
                <Text style={s.aiTitle}>AI Clinic Insights</Text>
                <View style={s.aiBetaBadge}><Text style={s.aiBetaTxt}>BETA</Text></View>
              </View>
              <TouchableOpacity style={s.aiViewAllBtn}>
                <Text style={s.aiViewAllTxt}>View all insights</Text>
                <Ionicons name="arrow-forward" size={13} color="#4361EE" />
              </TouchableOpacity>
            </View>

            {/* Metrics row */}
            <View style={s.aiMetricsRow}>
              {[
                {
                  icon: 'people'       as IoniconsName,
                  color: '#ef4444',
                  label: 'At-risk patients',
                  value: insights ? String(insights.total_at_risk) : '—',
                  trend: 'up',
                },
                {
                  icon: 'alarm'        as IoniconsName,
                  color: '#f59e0b',
                  label: 'Recall due',
                  value: insights ? String(insights.recall.total) : '—',
                  trend: 'up',
                },
                {
                  icon: 'trending-up'  as IoniconsName,
                  color: '#059669',
                  label: 'Potential revenue',
                  value: insights ? formatCurrency(insights.conversion.potential_revenue) : '—',
                  trend: 'up',
                },
                {
                  icon: 'shield'       as IoniconsName,
                  color: '#6366f1',
                  label: 'Revenue at risk',
                  value: insights ? formatCurrency(0) : '—',
                  trend: null,
                },
              ].map((m) => (
                <View key={m.label} style={s.aiMetric}>
                  <View style={s.aiMetricTop}>
                    <Ionicons name={m.icon} size={14} color={m.color} />
                    {m.trend === 'up' && <Ionicons name="arrow-up" size={11} color="#ef4444" />}
                  </View>
                  <Text style={s.aiMetricValue} numberOfLines={1} adjustsFontSizeToFit>{m.value}</Text>
                  <Text style={s.aiMetricLabel} numberOfLines={2}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Action buttons */}
            <View style={s.aiActions}>
              <TouchableOpacity style={s.aiOutlineBtn}>
                <Ionicons name="people-outline" size={15} color="#4361EE" />
                <Text style={s.aiOutlineBtnTxt}>Review Patients</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.aiSolidBtnWrap}>
                <LinearGradient colors={['#4361EE', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.aiSolidBtn}>
                  <Ionicons name="send" size={14} color="#fff" />
                  <Text style={s.aiSolidBtnTxt}>Send Reminders</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Today's Schedule ── */}
        <View style={s.pad}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardTitleRow}>
                <View style={s.cardIconBox}>
                  <Ionicons name="calendar" size={16} color="#4361EE" />
                </View>
                <Text style={s.cardTitle}>Today's Schedule</Text>
              </View>
              <TouchableOpacity style={s.cardLinkBtn}>
                <Text style={s.cardLink}>View calendar</Text>
                <Ionicons name="chevron-forward" size={13} color="#4361EE" />
              </TouchableOpacity>
            </View>

            {loading ? (
              [1, 2, 3].map((i) => <View key={i} style={s.apptSkeleton} />)
            ) : todayAppts.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="sunny-outline" size={32} color="#c7d7ff" />
                <Text style={s.emptyTxt}>No appointments today</Text>
              </View>
            ) : (
              todayAppts.map((appt, idx) => {
                const st = APPT_STATUS[appt.status] ?? APPT_STATUS.scheduled;
                return (
                  <View key={appt.id} style={s.apptRow}>
                    <Text style={s.apptTime}>{appt.start_time}</Text>
                    <View style={s.tlCol}>
                      <View style={[s.tlDot, { backgroundColor: st.color }]} />
                      {idx < todayAppts.length - 1 && <View style={s.tlLine} />}
                    </View>
                    <View style={[s.apptCard, { borderLeftColor: st.color }]}>
                      <View style={s.apptCardContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.apptPatient}>{appt.patient.first_name} {appt.patient.last_name}</Text>
                          <Text style={s.apptTreatment}>{appt.notes || 'Consultation'}</Text>
                        </View>
                        <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                          <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.pad}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.qaRow}>
            {QUICK_ACTIONS.map((qa) => (
              <TouchableOpacity key={qa.label} style={s.qaBtn} activeOpacity={0.75}>
                <View style={[s.qaIcon, { backgroundColor: qa.bg }]}>
                  <Ionicons name={qa.icon} size={22} color={qa.color} />
                </View>
                <Text style={s.qaLabel}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Today's Collection Breakdown ── */}
        <View style={s.pad}>
          <Text style={s.sectionTitle}>{"Today's Collection"}</Text>
          <View style={s.breakdownRow}>
            {[
              { label: 'Cash',  icon: 'cash'         as IoniconsName, color: '#059669', bg: '#d1fae5', value: payments?.cash },
              { label: 'Card',  icon: 'card'         as IoniconsName, color: '#0891b2', bg: '#e0f2fe', value: payments?.card },
              { label: 'UPI',   icon: 'phone-portrait' as IoniconsName, color: '#7c3aed', bg: '#ede9fe', value: payments?.upi },
            ].map((item) => (
              <View key={item.label} style={s.breakdownCard}>
                <View style={[s.breakdownIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={s.breakdownValue} numberOfLines={1} adjustsFontSizeToFit>
                  {payments === null ? '—' : formatCurrency(item.value ?? 0)}
                </Text>
                <Text style={s.breakdownLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Monthly Overview ── */}
        <View style={s.pad}>
          <Text style={s.sectionTitle}>Monthly Overview</Text>
          <View style={s.card}>
            {[
              { label: 'Revenue',    icon: 'trending-up'   as IoniconsName, color: '#059669', bg: '#d1fae5', value: summary?.this_month_revenue },
              { label: 'Expenses',   icon: 'trending-down' as IoniconsName, color: '#dc2626', bg: '#fee2e2', value: summary?.this_month_expenses },
              { label: 'Net Profit', icon: 'bar-chart'     as IoniconsName, color: '#4361EE', bg: '#EEF2FF', value: summary?.net_profit },
            ].map((item, idx, arr) => (
              <View
                key={item.label}
                style={[s.monthlyRow, idx < arr.length - 1 && s.monthlyRowBorder]}
              >
                <View style={[s.monthlyIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={s.monthlyLabel}>{item.label}</Text>
                <Text style={[s.monthlyValue, { color: item.color }]} numberOfLines={1} adjustsFontSizeToFit>
                  {loading ? '—' : formatCurrency(item.value ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Revenue Overview Chart ── */}
        <View style={s.pad}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Revenue Overview</Text>
              <View style={s.periodToggle}>
                <TouchableOpacity
                  onPress={() => switchPeriod('7')}
                  style={[s.periodBtn, chartPeriod === '7' && s.periodBtnActive]}
                >
                  <Text style={[s.periodBtnTxt, chartPeriod === '7' && s.periodBtnTxtActive]}>Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => switchPeriod('30')}
                  style={[s.periodBtn, chartPeriod === '30' && s.periodBtnActive]}
                >
                  <Text style={[s.periodBtnTxt, chartPeriod === '30' && s.periodBtnTxtActive]}>Month</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.chartAmtRow}>
              <Text style={s.chartAmt}>
                {loading ? '—' : formatCurrency(chartTotal)}
              </Text>
              <View style={s.chartGrowthRow}>
                <Ionicons name="trending-up" size={14} color="#059669" />
                <Text style={s.chartGrowthTxt}>18.6%</Text>
                <Text style={s.chartGrowthSub}>vs last {chartPeriod === '7' ? 'week' : 'month'}</Text>
              </View>
            </View>

            <BarChart data={chartData} period={chartPeriod} />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const BREAKDOWN_W = (SW - 32 - 16) / 3;

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#F0F4FF' },
  safeTop: { backgroundColor: '#fff' },
  scroll:  { flex: 1 },
  pad:     { paddingHorizontal: 16, marginTop: 16 },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center' },
  greetBlock:  { flex: 1 },
  greetSub:    { fontSize: 12, color: '#64748b' },
  greetName:   { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center' },
  bellBadge:   { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  bellBadgeTxt:{ fontSize: 9, fontWeight: '700', color: '#fff' },
  avatarWrap:  { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', ...shadow.sm },
  avatarGrad:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  onlineDot:   { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', marginHorizontal: 16, marginTop: 8, borderRadius: 10, padding: 12 },
  errorTxt:    { fontSize: 13, color: '#991b1b', flex: 1 },

  // Overview
  overviewCard:    { borderRadius: 20, padding: 18, ...shadow.md },
  overviewHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  overviewTitle:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  viewAllBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllTxt:      { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  overviewGrid:    { flexDirection: 'row', gap: 8 },
  overviewItem:    { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4 },
  overviewIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  overviewValue:   { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 },
  overviewLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500', textAlign: 'center' },
  ovSkeleton:      { width: 36, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 2 },

  // Card
  card:        { backgroundColor: '#fff', borderRadius: 20, padding: 16, ...shadow.sm },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardLink:    { fontSize: 13, color: '#4361EE', fontWeight: '500' },

  // Schedule
  apptRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  apptTime:       { width: 52, fontSize: 11, fontWeight: '600', color: '#64748b', paddingTop: 8 },
  tlCol:          { alignItems: 'center', width: 14 },
  tlDot:          { width: 12, height: 12, borderRadius: 6, marginTop: 7 },
  tlLine:         { flex: 1, width: 2, backgroundColor: '#e2e8f0', marginTop: 3, minHeight: 24 },
  apptCard:       { flex: 1, backgroundColor: '#F8FAFF', borderRadius: 12, borderLeftWidth: 3, paddingVertical: 8, paddingHorizontal: 10 },
  apptCardContent:{ flexDirection: 'row', alignItems: 'center' },
  apptPatient:    { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  apptTreatment:  { fontSize: 11, color: '#64748b', marginTop: 1 },
  statusPill:     { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 6 },
  statusTxt:      { fontSize: 11, fontWeight: '600' },
  apptSkeleton:   { height: 46, backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 8 },
  emptyBox:       { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt:       { fontSize: 13, color: '#94a3b8' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },

  // AI Clinic Insights
  aiCard:         { backgroundColor: '#F5F3FF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#DDD6FE', ...shadow.sm },
  aiHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  aiTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitle:        { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  aiBetaBadge:    { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  aiBetaTxt:      { fontSize: 9, fontWeight: '700', color: '#7C3AED', letterSpacing: 0.5 },
  aiViewAllBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiViewAllTxt:   { fontSize: 12, color: '#4361EE', fontWeight: '600' },
  aiMetricsRow:   { flexDirection: 'row', gap: 6, marginBottom: 14 },
  aiMetric:       { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, gap: 3 },
  aiMetricTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiMetricValue:  { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  aiMetricLabel:  { fontSize: 9, color: '#64748b', fontWeight: '500', lineHeight: 13 },
  aiActions:      { flexDirection: 'row', gap: 8 },
  aiOutlineBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#4361EE', backgroundColor: '#fff' },
  aiOutlineBtnTxt:{ fontSize: 13, fontWeight: '600', color: '#4361EE' },
  aiSolidBtnWrap: { flex: 1, borderRadius: 12, overflow: 'hidden', ...shadow.sm },
  aiSolidBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  aiSolidBtnTxt:  { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Quick Actions
  qaRow:  { flexDirection: 'row', gap: 8 },
  qaBtn:  { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8, ...shadow.sm },
  qaIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel:{ fontSize: 11, fontWeight: '600', color: '#0f172a', textAlign: 'center', lineHeight: 15 },

  // Breakdown (cash/card/upi + outstanding/discount/gst)
  breakdownRow:  { flexDirection: 'row', gap: 8 },
  finRow:        { flexDirection: 'row', gap: 8 },
  breakdownCard: { width: BREAKDOWN_W, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', gap: 6, ...shadow.sm },
  breakdownIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  breakdownValue:{ fontSize: 13, fontWeight: '800', color: '#0f172a' },
  breakdownLabel:{ fontSize: 11, color: '#64748b', fontWeight: '500' },

  // Monthly overview rows
  monthlyRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  monthlyRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  monthlyIcon:      { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  monthlyLabel:     { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  monthlyValue:     { fontSize: 15, fontWeight: '800' },

  // Chart
  periodToggle:     { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 20, padding: 2 },
  periodBtn:        { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 18 },
  periodBtnActive:  { backgroundColor: '#4361EE' },
  periodBtnTxt:     { fontSize: 12, fontWeight: '600', color: '#64748b' },
  periodBtnTxtActive: { color: '#fff' },
  chartAmtRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  chartAmt:       { fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  chartGrowthRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chartGrowthTxt: { fontSize: 13, fontWeight: '700', color: '#059669' },
  chartGrowthSub: { fontSize: 11, color: '#94a3b8' },
});
