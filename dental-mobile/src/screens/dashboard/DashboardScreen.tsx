import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { dashboardService } from '../../services/dashboard.service';
import { appointmentService } from '../../services/appointment.service';
import { useAuthStore } from '../../store/auth.store';
import Badge from '../../components/Badge';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import type { DashboardSummary, Appointment } from '../../types';
import { useBottomInset } from '../../hooks/useBottomInset';

const TODAY = new Date().toISOString().split('T')[0];

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STAT_CARDS: Array<{
  key: string;
  label: string;
  icon: IoniconsName;
  gradientColors: [string, string, string];
  prefix?: string;
}> = [
  {
    key: 'today_appointments',
    label: "Today's Appts",
    icon: 'calendar',
    gradientColors: ['#0891b2', '#22d3ee', '#67e8f9'],
  },
  {
    key: 'today_revenue',
    label: "Today's Revenue",
    icon: 'wallet',
    gradientColors: ['#059669', '#34d399', '#6ee7b7'],
    prefix: '₹',
  },
  {
    key: 'pending_invoices',
    label: 'Pending Invoices',
    icon: 'document-text',
    gradientColors: ['#d97706', '#fbbf24', '#fde68a'],
  },
  {
    key: 'low_inventory_count',
    label: 'Low Stock',
    icon: 'cube',
    gradientColors: ['#dc2626', '#f87171', '#fca5a5'],
  },
];

export default function DashboardScreen() {
  const { user, clinicName } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const bottomInset = useBottomInset();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoadError(false);
      const [s, appts] = await Promise.all([
        dashboardService.getSummary(),
        appointmentService.list({ date: TODAY }),
      ]);
      setSummary(s);
      setTodayAppts(appts.data?.slice(0, 8) || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatValue = (key: string, prefix = '') => {
    if (!summary) return '—';
    const val = summary[key as keyof DashboardSummary] ?? 0;
    if (key === 'today_revenue') return `${prefix}${Number(val).toLocaleString('en-IN')}`;
    return String(val);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0e7490" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing['2xl'] + bottomInset }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fff']} tintColor="#fff" progressBackgroundColor="#0891b2" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={['#0e7490', '#0891b2', '#06b6d4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.topHeader}>
              <View style={styles.headerLeft}>
                {clinicName ? (
                  <Text style={styles.clinicName} numberOfLines={1}>{clinicName}</Text>
                ) : null}
                <Text style={styles.greeting}>
                  {greeting()},{' '}
                  <Text style={styles.greetingName}>{user?.name?.split(' ')[0] || 'Doctor'}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
                <Text style={styles.avatarText}>
                  {(user?.name ?? 'U').charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.dateChip}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>
          {loadError && !loading && (
            <TouchableOpacity
              onPress={() => { setLoading(true); loadData(); }}
              style={styles.errorBanner}
            >
              <Ionicons name="alert-circle" size={16} color="#991b1b" />
              <Text style={styles.errorBannerText}>Couldn't load data. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {/* ── Stat cards ── */}
          <View style={styles.statsGrid}>
            {STAT_CARDS.map((card) => (
              <LinearGradient
                key={card.key}
                colors={card.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCard}
              >
                <View style={styles.statIconBg}>
                  <Ionicons name={card.icon} size={18} color="#fff" />
                </View>
                {loading ? (
                  <View style={styles.statSkeleton} />
                ) : (
                  <Text style={styles.statValue} numberOfLines={1}>
                    {getStatValue(card.key, card.prefix)}
                  </Text>
                )}
                <Text style={styles.statLabel}>{card.label}</Text>
              </LinearGradient>
            ))}
          </View>

          {/* ── Today's schedule ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={18} color="#0e7490" />
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{todayAppts.length}</Text>
              </View>
            </View>

            {loading ? (
              [1, 2, 3].map((i) => (
                <View key={i} style={styles.apptSkeleton} />
              ))
            ) : todayAppts.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="sunny" size={28} color="#0891b2" />
                </View>
                <Text style={styles.emptyTitle}>All clear today!</Text>
                <Text style={styles.emptySubtitle}>No appointments scheduled</Text>
              </View>
            ) : (
              todayAppts.map((appt, index) => (
                <View key={appt.id} style={styles.apptCard}>
                  {/* Timeline dot */}
                  <View style={styles.timeline}>
                    <View style={[
                      styles.timelineDot,
                      appt.status === 'completed' && styles.timelineDotDone,
                      appt.status === 'cancelled' && styles.timelineDotCancel,
                    ]} />
                    {index < todayAppts.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  <View style={styles.apptContent}>
                    <View style={styles.apptTop}>
                      <View style={styles.apptTimeBlock}>
                        <Text style={styles.apptTime}>{appt.start_time}</Text>
                        <Text style={styles.apptTimeEnd}>{appt.end_time}</Text>
                      </View>
                      <View style={styles.apptInfo}>
                        <Text style={styles.apptPatient}>
                          {appt.patient.first_name} {appt.patient.last_name}
                        </Text>
                        <View style={styles.apptDentistRow}>
                          <Ionicons name="person-outline" size={10} color="#94a3b8" />
                          <Text style={styles.apptDentist}>Dr. {appt.dentist.name}</Text>
                        </View>
                      </View>
                      <Badge label={appt.status} variant={appt.status} showDot={false} size="sm" />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },

  // Gradient Header
  headerGradient: {
    paddingBottom: spacing.xl,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerLeft: { flex: 1 },
  clinicName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  greeting: { fontSize: typography.md, color: 'rgba(255,255,255,0.9)', fontWeight: '400' },
  greetingName: { fontWeight: '700', color: '#ffffff' },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: typography.md, fontWeight: '700', color: '#ffffff' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  dateChip: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // Body
  body: {
    padding: spacing.lg,
    marginTop: -spacing.sm,
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorBannerText: { fontSize: typography.sm, color: '#991b1b', fontWeight: '500', flex: 1 },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    borderRadius: radius.xl,
    padding: spacing.base,
    minHeight: 130,
    justifyContent: 'space-between',
    ...shadow.md,
    overflow: 'hidden',
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: 4,
  },
  statSkeleton: {
    height: 30,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },

  // Section
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.md,
    fontWeight: '700',
    color: '#0f172a',
  },
  countPill: {
    backgroundColor: '#0891b2',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  // Appointment cards
  apptCard: { flexDirection: 'row', gap: spacing.sm },
  timeline: { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0891b2',
    borderWidth: 2,
    borderColor: '#cffafe',
    marginTop: 16,
  },
  timelineDotDone: { backgroundColor: '#059669', borderColor: '#d1fae5' },
  timelineDotCancel: { backgroundColor: '#dc2626', borderColor: '#fee2e2' },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e2e8f0',
    marginTop: 2,
    marginBottom: -spacing.md,
  },
  apptContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadow.sm,
  },
  apptTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  apptTimeBlock: { minWidth: 46, alignItems: 'center' },
  apptTime: { fontSize: typography.sm, fontWeight: '700', color: '#0891b2' },
  apptTimeEnd: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  apptInfo: { flex: 1 },
  apptPatient: { fontSize: typography.sm, fontWeight: '600', color: '#0f172a' },
  apptDentistRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  apptDentist: { fontSize: 11, color: '#64748b' },

  // Skeleton
  apptSkeleton: {
    height: 66,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: spacing.sm,
    opacity: 0.6,
  },

  // Empty
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: typography.md, fontWeight: '700', color: '#0f172a' },
  emptySubtitle: { fontSize: typography.sm, color: '#64748b' },
});
