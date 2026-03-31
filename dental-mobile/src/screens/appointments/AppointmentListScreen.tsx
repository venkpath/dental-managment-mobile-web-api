import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/appointment.service';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Appointment, AppointmentStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

const FILTERS = ['All', 'Today', 'Scheduled', 'Completed'] as const;
type Filter = typeof FILTERS[number];

const TODAY = new Date().toISOString().split('T')[0];

export default function AppointmentListScreen() {
  const navigation = useNavigation<Nav>();
  const bottomInset = useBottomInset();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('Today');
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadAppointments = useCallback(async (f: Filter = filter, p = 1) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      setLoadError(false);
      const params: { page: number; limit: number; date?: string; status?: string } = { page: p, limit: 20 };
      if (f === 'Today') params.date = TODAY;
      if (f === 'Scheduled') params.status = 'scheduled';
      if (f === 'Completed') params.status = 'completed';
      const res = await appointmentService.list(params);
      const items = res.data || [];
      setAppointments(p === 1 ? items : (prev) => [...prev, ...items]);
      setHasMore(p < (res.meta?.totalPages ?? 1));
      setPage(p);
    } catch {
      if (p === 1) setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadAppointments(filter);
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments(filter, 1);
  };

  const onLoadMore = () => {
    if (!loadingMore && hasMore) loadAppointments(filter, page + 1);
  };

  const renderItem = ({ item }: { item: Appointment }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
    >
      <Card style={styles.card} padding={spacing.md}>
        <View style={styles.cardTop}>
          <View style={styles.timeBlock}>
            <Text style={styles.time}>{item.start_time}</Text>
            <Text style={styles.timeSep}>–</Text>
            <Text style={styles.timeEnd}>{item.end_time}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.patientName}>
              {item.patient.first_name} {item.patient.last_name}
            </Text>
            <Text style={styles.phone}>{item.patient.phone}</Text>
            <Text style={styles.dentist}>Dr. {item.dentist.name}</Text>
          </View>
          <Badge label={item.status} variant={item.status} />
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.date}>
            📅 {new Date(item.appointment_date).toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
          </Text>
          {item.branch && <Text style={styles.branch}>🏥 {item.branch.name}</Text>}
        </View>
        {item.notes && <Text style={styles.notes} numberOfLines={1}>📝 {item.notes}</Text>}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header with Book button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('BookAppointment', {})}
        >
          <Text style={styles.bookBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            loadError ? (
              <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="⚠️" />
            ) : (
              <EmptyState
                title="No appointments"
                subtitle={filter === 'Today' ? 'No appointments scheduled for today' : 'No appointments found'}
                icon="📅"
              />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  bookBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
  },
  bookBtnText: { fontSize: typography.sm, fontWeight: '700', color: colors.white },
  filters: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.white, fontWeight: '700' },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing['2xl'] },
  card: {},
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm },
  timeBlock: { alignItems: 'center', minWidth: 52 },
  time: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  timeSep: { fontSize: typography.xs, color: colors.textMuted },
  timeEnd: { fontSize: typography.xs, color: colors.textMuted },
  cardInfo: { flex: 1 },
  patientName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  phone: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  dentist: { fontSize: typography.xs, color: colors.primary, marginTop: 1 },
  dateRow: { flexDirection: 'row', gap: spacing.base },
  date: { fontSize: typography.xs, color: colors.textSecondary },
  branch: { fontSize: typography.xs, color: colors.textSecondary },
  notes: { fontSize: typography.xs, color: colors.textMuted, marginTop: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
