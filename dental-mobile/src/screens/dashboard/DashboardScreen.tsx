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
  gradientColors: [string, string];
  prefix?: string;
}> = [
  {
    key: 'today_appointments',
    label: "Today's Appointments",
    icon: 'calendar',
    gradientColors: ['#0891b2', '#06b6d4'],
  },
  {
    key: 'today_revenue',
    label: "Today's Revenue",
    icon: 'wallet',
    gradientColors: ['#059669', '#10b981'],
    prefix: '₹',
  },
  {
    key: 'pending_invoices',
    label: 'Pending Invoices',
    icon: 'document-text',
    gradientColors: ['#d97706', '#f59e0b'],
  },
  {
    key: 'low_inventory_count',
    label: 'Low Stock Items',
    icon: 'cube',
    gradientColors: ['#dc2626', '#ef4444'],
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
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
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.dateChip}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        </View>

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
              <View style={styles.statTop}>
                <View style={styles.statIconBg}>
                  <Ionicons name={card.icon} size={20} color={colors.white} />
                </View>
                {loading ? (
                  <View style={styles.statSkeleton} />
                ) : (
                  <Text style={styles.statValue} numberOfLines={1}>
                    {getStatValue(card.key, card.prefix)}
                  </Text>
                )}
              </View>
              <Text style={styles.statLabel}>{card.label}</Text>
            </LinearGradient>
          ))}
        </View>

        {/* ── Today's schedule ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={colors.text} />
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
              <View style={styles.emptyIconBg}>
                <Ionicons name="sunny" size={28} color={colors.primary} />
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
                      <Text style={styles.apptDentist}>
                        <Ionicons name="person" size={10} color={colors.textMuted} /> Dr. {appt.dentist.name}
                      </Text>
                    </View>
                    <Badge label={appt.status} variant={appt.status} showDot={false} size="sm" />
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
  content: { padding: spacing.lg },

  // Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headerLeft: { flex: 1 },
  clinicName: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  greeting: { fontSize: typography.md, color: colors.textSecondary, fontWeight: '400' },
  greetingName: { fontWeight: '700', color: colors.text },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.colored(colors.primary),
  },
  avatarText: { fontSize: typography.md, fontWeight: '700', color: colors.white },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dateChip: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Error banner
  errorBanner: {
    backgroundColor: colors.dangerLight,
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
    width: '47.5%',
    borderRadius: radius.xl,
    padding: spacing.base,
    minHeight: 120,
    justifyContent: 'space-between',
    ...shadow.md,
  },
  statTop: {
    gap: spacing.sm,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: typography.xs,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  statSkeleton: {
    height: 30,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.sm,
  },

  // Section
  section: { gap: spacing.md },
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
    flex: 1,
  },
  countPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
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
    borderColor: colors.primaryMid,
    marginTop: 16,
  },
  timelineDotDone: { backgroundColor: colors.success, borderColor: colors.successLight },
  timelineDotCancel: { backgroundColor: colors.danger, borderColor: colors.dangerLight },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 2,
    marginBottom: -spacing.md,
  },
  apptContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  apptTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  apptTimeBlock: { minWidth: 46, alignItems: 'center' },
  apptTime: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  apptTimeEnd: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  apptInfo: { flex: 1 },
  apptPatient: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  apptDentist: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Skeleton
  apptSkeleton: {
    height: 66,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    opacity: 0.6,
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: typography.sm, color: colors.textSecondary },
});
