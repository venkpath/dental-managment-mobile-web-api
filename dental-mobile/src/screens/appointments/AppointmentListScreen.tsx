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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/appointment.service';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, typography, radius, shadow } from '../../theme';
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
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.timeBlock}>
          <Text style={styles.time}>{item.start_time}</Text>
          <View style={styles.timeDivider} />
          <Text style={styles.timeEnd}>{item.end_time}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.patientName}>
            {item.patient.first_name} {item.patient.last_name}
          </Text>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={12} color={colors.textMuted} />
            <Text style={styles.phone}>{item.patient.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={12} color={colors.primary} />
            <Text style={styles.dentist}>Dr. {item.dentist.name}</Text>
          </View>
        </View>
        <Badge label={item.status} variant={item.status} showDot={false} size="sm" />
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={styles.date}>
            {new Date(item.appointment_date).toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
          </Text>
        </View>
        {item.branch && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={12} color={colors.textMuted} />
            <Text style={styles.branch}>{item.branch.name}</Text>
          </View>
        )}
      </View>
      {item.notes && (
        <View style={[styles.detailRow, { marginTop: spacing.xs }]}>
          <Ionicons name="document-text-outline" size={12} color={colors.textMuted} />
          <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('BookAppointment', {})}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
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
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} />
              : hasMore
              ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore}>
                  <Text style={styles.loadMoreText}>Load More</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.primary} />
                </TouchableOpacity>
              )
              : appointments.length > 0
              ? <Text style={styles.endText}>All appointments loaded</Text>
              : null
          }
          ListEmptyComponent={
            loadError ? (
              <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="alert-circle" />
            ) : (
              <EmptyState
                title="No appointments"
                subtitle={filter === 'Today' ? 'No appointments scheduled for today' : 'No appointments found'}
                icon="calendar-outline"
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
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  headerTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  bookBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    ...shadow.colored(colors.primary),
  },
  bookBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.white },
  filters: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.lg,
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
  filterTextActive: { color: colors.white, fontWeight: '600' },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm },
  timeBlock: { alignItems: 'center', minWidth: 50 },
  time: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  timeDivider: { width: 12, height: 1, backgroundColor: colors.border, marginVertical: 3 },
  timeEnd: { fontSize: typography.xs, color: colors.textMuted },
  cardInfo: { flex: 1, gap: 3 },
  patientName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  phone: { fontSize: typography.xs, color: colors.textSecondary },
  dentist: { fontSize: typography.xs, color: colors.primary, fontWeight: '500' },
  cardBottom: { flexDirection: 'row', gap: spacing.base, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.sm },
  date: { fontSize: typography.xs, color: colors.textSecondary },
  branch: { fontSize: typography.xs, color: colors.textSecondary },
  notes: { fontSize: typography.xs, color: colors.textMuted, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadMoreBtn: {
    margin: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  loadMoreText: { fontSize: typography.sm, fontWeight: '600', color: colors.primary },
  endText: { textAlign: 'center', fontSize: typography.xs, color: colors.textMuted, padding: spacing.md },
});
