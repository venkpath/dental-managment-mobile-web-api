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
import { treatmentService } from '../../services/treatment.service';
import { formatCurrency } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import {
  PaginationBar,
  PageSizeSheet,
  IndeterminateBar,
  DEFAULT_PAGE_SIZE,
} from '../../components/Pagination';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import { radius } from '../../theme';
import { treatmentStatusMeta } from '../../utils/treatmentStatus';
import type { Treatment, TreatmentStatus, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  gray: '#64748b', grayLight: '#f1f5f9',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#f1f5f9',
};

type FilterKey = 'All' | 'Planned' | 'In Progress' | 'Completed';

const FILTERS: { key: FilterKey; dot: string; status?: TreatmentStatus }[] = [
  { key: 'All', dot: C.indigo },
  { key: 'Planned', dot: C.violet, status: 'planned' },
  { key: 'In Progress', dot: C.amber, status: 'in_progress' },
  { key: 'Completed', dot: C.green, status: 'completed' },
];

export default function ClinicTreatmentListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [items, setItems] = useState<Treatment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('All');
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

  const load = useCallback(async (
    p = 1,
    f: FilterKey = 'All',
    limit = DEFAULT_PAGE_SIZE,
    refresh = false,
  ) => {
    const seq = ++fetchSeq.current;
    if (refresh) setRefreshing(true);
    else setPageTransition(true);
    try {
      const def = FILTERS.find((d) => d.key === f);
      const res = await treatmentService.list({ page: p, limit, status: def?.status });
      if (seq !== fetchSeq.current) return;
      setLoadError(false);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? (res.data?.length ?? 0));
      setPage(p);
    } catch {
      if (seq === fetchSeq.current && p === 1) setLoadError(true);
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
      load(pageRef.current, filterRef.current, pageSizeRef.current);
    }, [load])
  );

  const handleFilterChange = (f: FilterKey) => {
    if (f === filter) return;
    setFilter(f);
    setPage(1);
    load(1, f, pageSize);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    load(p, filter, pageSize);
  };

  const changePageSize = (n: number) => {
    setPageSize(n);
    setPageSizeOpen(false);
    load(1, filter, n);
  };

  const onRefresh = () => load(page, filter, pageSize, true);

  const visible = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((t) => {
      const name = `${t.patient?.first_name ?? ''} ${t.patient?.last_name ?? ''}`.toLowerCase();
      return (
        name.includes(q) ||
        t.procedure.toLowerCase().includes(q) ||
        t.diagnosis.toLowerCase().includes(q) ||
        (t.tooth_number ?? '').includes(q)
      );
    });
  }, [items, searchQuery]);

  const renderItem = useCallback(({ item }: { item: Treatment }) => {
    const sm = treatmentStatusMeta(item.status);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TreatmentDetail', { treatmentId: item.id })}
        style={s.card}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, { backgroundColor: sm.bg }]}>
            <Ionicons name="medkit" size={20} color={sm.fg} />
          </View>
          <View style={s.cardInfo}>
            <Text style={s.procedure} numberOfLines={1}>{item.procedure}</Text>
            <Text style={s.patientName} numberOfLines={1}>
              {item.patient.first_name} {item.patient.last_name}
            </Text>
            <View style={s.metaRow}>
              {item.tooth_number ? (
                <Text style={s.tooth}>Tooth {item.tooth_number}</Text>
              ) : null}
              <Text style={s.diagnosis} numberOfLines={1}>{item.diagnosis}</Text>
            </View>
          </View>
          <View style={s.cardRight}>
            <Text style={s.cost}>{formatCurrency(Number(item.cost))}</Text>
            <View style={[s.statusPill, { backgroundColor: sm.bg }]}>
              <Text style={[s.statusPillTxt, { color: sm.fg }]}>{sm.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Treatments</Text>
          <Text style={s.subtitle}>Clinical procedures & billing</Text>
        </View>
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search patient, procedure or diagnosis"
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

      {initialLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
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
                  title="No treatments"
                  subtitle={searchQuery.trim() ? `No results for "${searchQuery}"` : 'No treatments for this filter'}
                  icon="medkit-outline"
                />
              )
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {!initialLoading && total > 0 && (
        <View style={[s.pagFooter, { paddingBottom: Math.max(6, bottomInset) }]} pointerEvents={pageTransition ? 'none' : 'auto'}>
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
        noun="treatments"
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
  searchWrap: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.bg },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  filtersRow: { flexGrow: 0, backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  filtersContent: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
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
  procedure: { fontSize: 15, fontWeight: '800', color: C.text },
  patientName: { fontSize: 12, fontWeight: '600', color: C.indigo },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tooth: { fontSize: 11, fontWeight: '700', color: C.violet },
  diagnosis: { fontSize: 11, color: C.textMuted, flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  cost: { fontSize: 16, fontWeight: '800', color: C.text },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillTxt: { fontSize: 10, fontWeight: '700' },
  pagFooter: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
});
