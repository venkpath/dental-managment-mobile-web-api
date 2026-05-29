import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/appointment.service';
import { getLocale } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import {
  PaginationBar,
  PageSizeSheet,
  IndeterminateBar,
  DEFAULT_PAGE_SIZE,
} from '../../components/Pagination';
import { radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import type { Appointment, AppointmentStatus, AppointmentStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

// ─── Design tokens (shared with billing / patient lists) ─────────────────────
const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  red: '#dc2626', redLight: '#fee2e2',
  gray: '#64748b', grayLight: '#f1f5f9',
  teal: '#0891b2', tealLight: '#ecfeff',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  orange: '#ea580c', orangeLight: '#ffedd5',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#f1f5f9',
};

const todayStr = () => new Date().toISOString().split('T')[0];
const farFutureStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().split('T')[0];
};

// ─── Filters → backend params ────────────────────────────────────────────────
type FilterKey = 'Today' | 'Upcoming' | 'All' | 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';

interface FilterDef {
  key: FilterKey;
  dot: string;
  build: () => { date?: string; start_date?: string; end_date?: string; status?: string };
}

const FILTERS: FilterDef[] = [
  { key: 'Today',     dot: C.indigo,  build: () => ({ date: todayStr() }) },
  { key: 'Upcoming',  dot: C.teal,    build: () => ({ start_date: todayStr(), end_date: farFutureStr() }) },
  { key: 'All',       dot: C.gray,    build: () => ({}) },
  { key: 'Scheduled', dot: C.indigo,  build: () => ({ status: 'scheduled' }) },
  { key: 'Completed', dot: C.green,   build: () => ({ status: 'completed' }) },
  { key: 'Cancelled', dot: C.red,     build: () => ({ status: 'cancelled' }) },
  { key: 'No Show',   dot: C.amber,   build: () => ({ status: 'no_show' }) },
];

// ─── Status visuals ──────────────────────────────────────────────────────────
function statusMeta(status: AppointmentStatus) {
  switch (status) {
    case 'scheduled':   return { bg: C.indigoLight, fg: C.indigo, label: 'Scheduled' };
    case 'checked_in':  return { bg: C.tealLight,   fg: C.teal,   label: 'Checked In' };
    case 'in_progress': return { bg: C.violetLight, fg: C.violet, label: 'In Progress' };
    case 'completed':   return { bg: C.greenLight,  fg: C.green,  label: 'Completed' };
    case 'cancelled':   return { bg: C.redLight,    fg: C.red,    label: 'Cancelled' };
    case 'no_show':     return { bg: C.amberLight,  fg: C.amber,  label: 'No Show' };
    default:            return { bg: C.grayLight,   fg: C.gray,   label: String(status) };
  }
}

function isPastAppointment(appt: Appointment): boolean {
  const now = new Date();
  const d = new Date(appt.appointment_date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const apptDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (apptDay < today) return true;
  if (apptDay.getTime() === today.getTime() && appt.end_time) {
    const [h, m] = appt.end_time.split(':').map(Number);
    return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
  }
  return false;
}

const fmtTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function AppointmentListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('Today');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchSeq = useRef(0);
  const filterRef = useRef(filter);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  filterRef.current = filter;
  pageRef.current = page;
  pageSizeRef.current = pageSize;

  const loadAppointments = useCallback(async (
    p = 1,
    f: FilterKey = 'Today',
    limit = DEFAULT_PAGE_SIZE,
    refresh = false,
  ) => {
    const seq = ++fetchSeq.current;
    if (refresh) setRefreshing(true);
    else setPageTransition(true);

    try {
      const def = FILTERS.find((d) => d.key === f);
      const res = await appointmentService.list({ ...(def?.build() ?? {}), page: p, limit });
      if (seq !== fetchSeq.current) return;
      setLoadError(false);
      setAppointments(res.data ?? []);
      setTotal(res.meta?.total ?? (res.data?.length ?? 0));
      setPage(p);
    } catch {
      if (seq === fetchSeq.current && p === 1) {
        setLoadError(true);
        setAppointments([]);
      }
    } finally {
      if (seq === fetchSeq.current) {
        setInitialLoading(false);
        setRefreshing(false);
        setPageTransition(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAppointments(pageRef.current, filterRef.current, pageSizeRef.current);
    }, [loadAppointments])
  );

  const handleFilterChange = (f: FilterKey) => {
    if (f === filter) return;
    setFilter(f);
    setPage(1);
    setSearchQuery('');
    loadAppointments(1, f, pageSize);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadAppointments(p, filter, pageSize);
  };

  const changePageSize = (n: number) => {
    setPageSize(n);
    setPageSizeOpen(false);
    loadAppointments(1, filter, n);
  };

  const onRefresh = () => loadAppointments(page, filter, pageSize, true);

  const visible = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase();
    return appointments.filter((a) => {
      const name = `${a.patient?.first_name ?? ''} ${a.patient?.last_name ?? ''}`.toLowerCase();
      return name.includes(q) || (a.patient?.phone ?? '').includes(q) || (a.dentist?.name ?? '').toLowerCase().includes(q);
    });
  }, [appointments, searchQuery]);

  const renderItem = useCallback(({ item }: { item: Appointment }) => {
    const sm = statusMeta(item.status);
    const pastDue = (item.status === 'scheduled' || item.status === 'checked_in') && isPastAppointment(item);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
        style={s.card}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, { backgroundColor: sm.bg }]}>
            <Ionicons name="calendar" size={20} color={sm.fg} />
          </View>

          <View style={s.cardInfo}>
            <Text style={s.patientName} numberOfLines={1}>
              {item.patient?.first_name} {item.patient?.last_name}
            </Text>
            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={12} color={C.textMuted} />
              <Text style={s.metaText} numberOfLines={1}>
                {fmtTime(item.start_time)}{item.end_time ? ` – ${fmtTime(item.end_time)}` : ''}
              </Text>
            </View>
            <View style={s.metaRow}>
              <Ionicons name="person-outline" size={12} color={C.indigo} />
              <Text style={s.dentistText} numberOfLines={1}>Dr. {item.dentist?.name}</Text>
            </View>
          </View>

          <View style={s.cardRight}>
            <Text style={s.dateText}>
              {new Date(item.appointment_date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
            </Text>
            <View style={[s.statusPill, { backgroundColor: sm.bg }]}>
              <Text style={[s.statusPillTxt, { color: sm.fg }]}>{sm.label}</Text>
            </View>
            {pastDue && (
              <View style={s.pastDuePill}>
                <Text style={s.pastDueTxt}>Past Due</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Appointments</Text>
          <Text style={s.subtitle}>Manage patient appointments</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('BookAppointment', {})}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by patient, phone or doctor"
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersRow}
        contentContainerStyle={s.filtersContent}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterTab, active && s.filterTabActive]}
              onPress={() => handleFilterChange(f.key)}
              activeOpacity={0.7}
            >
              {!active && <View style={[s.filterDot, { backgroundColor: f.dot }]} />}
              <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{f.key}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {initialLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.indigo} />
        </View>
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          {pageTransition && <IndeterminateBar />}
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={[{ flex: 1 }, pageTransition && { opacity: 0.55 }]}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.indigo]} />}
            ListEmptyComponent={
              loadError ? (
                <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="alert-circle" />
              ) : (
                <EmptyState
                  title="No appointments"
                  subtitle={searchQuery.trim() ? `No results for "${searchQuery}"` : 'No appointments for this filter'}
                  icon="calendar-outline"
                />
              )
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
          />
        </View>
      )}

      {/* Pagination */}
      {!initialLoading && total > 0 && (
        <View
          style={[s.pagFooter, { paddingBottom: Math.max(6, bottomInset) }]}
          pointerEvents={pageTransition ? 'none' : 'auto'}
        >
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={goToPage}
            onPickPageSize={() => setPageSizeOpen(true)}
          />
        </View>
      )}

      <PageSizeSheet
        visible={pageSizeOpen}
        pageSize={pageSize}
        noun="appointments"
        onPick={changePageSize}
        onClose={() => setPageSizeOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10, backgroundColor: C.bg },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center', shadowColor: C.indigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 10, backgroundColor: C.bg },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },

  filtersRow: { flexGrow: 0, backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  filtersContent: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: C.bg, gap: 5 },
  filterTabActive: { backgroundColor: C.indigo },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterTabText: { fontSize: 13, fontWeight: '500', color: C.textSub },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, gap: 3 },
  patientName: { fontSize: 15, fontWeight: '800', color: C.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: C.textSub, flexShrink: 1 },
  dentistText: { fontSize: 12, color: C.indigo, fontWeight: '600', flexShrink: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  dateText: { fontSize: 13, fontWeight: '800', color: C.text },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  pastDuePill: { backgroundColor: C.orangeLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pastDueTxt: { fontSize: 10, fontWeight: '700', color: C.orange },

  pagFooter: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
});
