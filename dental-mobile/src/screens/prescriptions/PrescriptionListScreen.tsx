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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { prescriptionService } from '../../services/prescription.service';
import { getLocale } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import {
  PaginationBar,
  PageSizeSheet,
  IndeterminateBar,
  DEFAULT_PAGE_SIZE,
} from '../../components/Pagination';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import type { Prescription, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#f1f5f9',
};

const SEARCH_DEBOUNCE_MS = 350;

export default function PrescriptionListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [items, setItems] = useState<Prescription[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const searchRef = useRef(searchQuery);
  pageRef.current = page;
  pageSizeRef.current = pageSize;
  searchRef.current = searchQuery;

  const cancelSearchDebounce = () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
  };

  const load = useCallback(async (
    p = 1,
    limit = DEFAULT_PAGE_SIZE,
    search = '',
    refresh = false,
  ) => {
    const seq = ++fetchSeq.current;
    if (refresh) setRefreshing(true);
    else setPageTransition(true);
    try {
      const res = await prescriptionService.list({
        page: p,
        limit,
        search: search.trim() || undefined,
      });
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

  const scheduleSearchReload = useCallback(() => {
    cancelSearchDebounce();
    searchTimer.current = setTimeout(() => {
      searchTimer.current = null;
      setPage(1);
      load(1, pageSizeRef.current, searchRef.current);
    }, SEARCH_DEBOUNCE_MS);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      cancelSearchDebounce();
      load(pageRef.current, pageSizeRef.current, searchRef.current);
    }, [load]),
  );

  const onSearchChange = (text: string) => {
    searchRef.current = text;
    setSearchQuery(text);
    setPage(1);
    scheduleSearchReload();
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    cancelSearchDebounce();
    load(p, pageSize, searchQuery);
  };

  const changePageSize = (n: number) => {
    setPageSize(n);
    setPageSizeOpen(false);
    pageSizeRef.current = n;
    cancelSearchDebounce();
    load(1, n, searchQuery);
  };

  const onRefresh = () => {
    cancelSearchDebounce();
    load(page, pageSize, searchQuery, true);
  };

  const renderItem = useCallback(({ item }: { item: Prescription }) => {
    const medCount = item.items?.length ?? 0;
    const firstMeds = (item.items ?? []).slice(0, 2).map((m) => m.medicine_name).filter(Boolean).join(', ');
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })}
        style={s.card}
      >
        <View style={s.cardRow}>
          <View style={s.iconBox}>
            <Ionicons name="document-text" size={20} color={C.indigo} />
          </View>

          <View style={s.cardInfo}>
            <Text style={s.patientName} numberOfLines={1}>
              {item.patient ? `${item.patient.first_name} ${item.patient.last_name}` : 'Unknown patient'}
            </Text>
            {item.diagnosis ? (
              <Text style={s.diagnosis} numberOfLines={1}>{item.diagnosis}</Text>
            ) : firstMeds ? (
              <Text style={s.diagnosis} numberOfLines={1}>{firstMeds}</Text>
            ) : null}
            <View style={s.metaRow}>
              <Ionicons name="person-outline" size={11} color={C.indigo} />
              <Text style={s.dentistText} numberOfLines={1}>Dr. {item.dentist?.name ?? '—'}</Text>
              <Text style={s.dot}>·</Text>
              <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
              <Text style={s.dateText}>
                {new Date(item.created_at).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={s.cardRight}>
            <View style={s.rxBadge}>
              <Text style={s.rxText}>Rx</Text>
            </View>
            <View style={s.medPill}>
              <Text style={s.medPillTxt}>{medCount} med{medCount === 1 ? '' : 's'}</Text>
            </View>
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
          <Text style={s.title}>Prescriptions</Text>
          <Text style={s.subtitle}>All issued prescriptions</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by patient name"
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* List */}
      {initialLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.indigo} />
        </View>
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          {pageTransition && <IndeterminateBar />}
          <FlatList
            data={items}
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
                  title="No prescriptions"
                  subtitle={searchQuery.trim() ? `No results for "${searchQuery}"` : 'No prescriptions issued yet'}
                  icon="document-text-outline"
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
        noun="prescriptions"
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

  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: C.indigoLight },
  cardInfo: { flex: 1, gap: 3 },
  patientName: { fontSize: 15, fontWeight: '800', color: C.text },
  diagnosis: { fontSize: 12, color: C.textSub },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  dentistText: { fontSize: 11, color: C.indigo, fontWeight: '600', flexShrink: 1 },
  dot: { fontSize: 11, color: C.textMuted, marginHorizontal: 2 },
  dateText: { fontSize: 11, color: C.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  rxBadge: { backgroundColor: C.indigo, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  rxText: { fontSize: 12, fontWeight: '800', color: '#fff', fontStyle: 'italic' },
  medPill: { backgroundColor: C.indigoLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  medPillTxt: { fontSize: 10, fontWeight: '700', color: C.indigo },

  pagFooter: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
});
