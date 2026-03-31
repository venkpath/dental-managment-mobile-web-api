import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const STAT_CARDS = [
  {
    key: 'today_appointments',
    label: "Today's\nAppointments",
    icon: '📅',
    bg: colors.primary,
    lightBg: '#0e7490',
  },
  {
    key: 'today_revenue',
    label: "Today's\nRevenue",
    icon: '💰',
    bg: '#16a34a',
    lightBg: '#15803d',
    prefix: '₹',
  },
  {
    key: 'pending_invoices',
    label: 'Pending\nInvoices',
    icon: '🧾',
    bg: '#d97706',
    lightBg: '#b45309',
  },
  {
    key: 'low_inventory_count',
    label: 'Low Stock\nItems',
    icon: '📦',
    bg: '#dc2626',
    lightBg: '#b91c1c',
  },
];

export default function DashboardScreen() {
  const { user } = useAuthStore();
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top header ── */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Doctor'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
            <Text style={styles.avatarText}>
              {(user?.name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dateChip}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>

        {loadError && !loading && (
          <TouchableOpacity
            onPress={() => { setLoading(true); loadData(); }}
            style={styles.errorBanner}
          >
            <Text style={styles.errorBannerText}>⚠️ Couldn't load data. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* ── Stat cards ── */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((card) => (
            <View key={card.key} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <View style={[styles.statIconBg, { backgroundColor: card.lightBg }]}>
                <Text style={styles.statIcon}>{card.icon}</Text>
              </View>
              {loading ? (
                <View style={styles.statSkeleton} />
              ) : (
                <Text style={styles.statValue} numberOfLines={1}>
                  {getStatValue(card.key, card.prefix)}
                </Text>
              )}
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Today's schedule ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
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
              <Text style={styles.emptyIcon}>🎉</Text>
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
                      <Text style={styles.apptDentist}>Dr. {appt.dentist.name}</Text>
                    </View>
                    <Badge label={appt.status} variant={appt.status} showDot={false} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.base },

  // Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  userName: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  avatarText: { fontSize: typography.md, fontWeight: '700', color: colors.white },
  dateChip: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    fontWeight: '500',
  },

  // Error banner
  errorBanner: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorBannerText: { fontSize: typography.sm, color: '#b91c1c', fontWeight: '600' },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.md,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statIcon: { fontSize: 20 },
  statValue: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    lineHeight: 15,
  },
  statSkeleton: {
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },

  // Section
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.text,
  },
  countPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { fontSize: 11, fontWeight: '700', color: colors.white },

  // Appointment cards
  apptCard: { flexDirection: 'row', gap: spacing.sm },
  timeline: { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    marginTop: 14,
  },
  timelineDotDone: { backgroundColor: colors.success, borderColor: colors.successLight },
  timelineDotCancel: { backgroundColor: colors.danger, borderColor: colors.dangerLight },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 2,
    marginBottom: -spacing.sm,
  },
  apptContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  apptTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  apptTimeBlock: { minWidth: 48, alignItems: 'center' },
  apptTime: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  apptTimeEnd: { fontSize: 10, color: colors.textMuted },
  apptInfo: { flex: 1 },
  apptPatient: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  apptDentist: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  // Skeleton
  apptSkeleton: {
    height: 66,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    opacity: 0.6,
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadow.sm,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: typography.sm, color: colors.textSecondary },
});
