import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Modal,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import { formatCurrency, getLocale } from '../../utils/format';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import type { Invoice, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

// ─── Design tokens ─────────────────────────────────────────────────────────
const C = {
  indigo:      '#4361EE',
  indigoLight: '#EEF2FF',
  green:       '#059669',
  greenLight:  '#d1fae5',
  amber:       '#d97706',
  amberLight:  '#fef3c7',
  red:         '#dc2626',
  redLight:    '#fee2e2',
  gray:        '#64748b',
  grayLight:   '#f1f5f9',
  teal:        '#0891b2',
  tealLight:   '#ecfeff',
  bg:          '#F8FAFC',
  surface:     '#ffffff',
  text:        '#0f172a',
  textSub:     '#475569',
  textMuted:   '#94a3b8',
  border:      '#E2E8F0',
  divider:     '#f1f5f9',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

// ─── Filters ────────────────────────────────────────────────────────────────
type FilterKey =
  | 'All'
  | 'Pending'
  | 'Partially Paid'
  | 'Paid'
  | 'Partially Refunded'
  | 'Refunded';

interface FilterDef {
  key: FilterKey;
  dot: string;
  apiStatus?: string;
  /** Backend rejects this status in the query enum — load all & filter locally */
  clientSideOnly?: boolean;
}

const FILTERS: FilterDef[] = [
  { key: 'All',                dot: C.indigo },
  { key: 'Pending',            dot: C.amber,  apiStatus: 'pending' },
  { key: 'Partially Paid',     dot: C.teal,   apiStatus: 'partially_paid' },
  { key: 'Paid',               dot: C.green,  apiStatus: 'paid' },
  { key: 'Partially Refunded', dot: C.red,    apiStatus: 'partially_refunded', clientSideOnly: true },
  { key: 'Refunded',           dot: C.gray,   apiStatus: 'refunded',           clientSideOnly: true },
];

interface StatusCounts {
  all: number;
  pending: number;
  partially_paid: number;
  paid: number;
  partially_refunded: number;
  refunded: number;
}

// ─── Indeterminate progress bar (page transitions) ──────────────────────────
function IndeterminateBar() {
  const x = useRef(new Animated.Value(-0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1, duration: 900,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  return (
    <View style={s.progressTrack}>
      <Animated.View
        style={[s.progressFill, {
          transform: [{
            translateX: x.interpolate({ inputRange: [-0.5, 1], outputRange: [-160, 600] }),
          }],
        }]}
      />
    </View>
  );
}

// ─── Pagination bar (mirrors PatientListScreen) ──────────────────────────────
interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPickPageSize: () => void;
}
const PaginationBar = React.memo(function PaginationBar({
  page, pageSize, total, totalPages, onPageChange, onPickPageSize,
}: PaginationBarProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const maxShow = 3;
  let start = Math.max(1, Math.min(page - 1, totalPages - maxShow + 1));
  if (start < 1) start = 1;
  const pageNums: number[] = [];
  for (let i = start; i < start + maxShow && i <= totalPages; i++) pageNums.push(i);

  const prevOff = page <= 1;
  const nextOff = page >= totalPages;

  return (
    <View style={pg.wrap}>
      <View style={pg.row1}>
        <Text style={pg.showing}>
          Showing <Text style={pg.bold}>{from}</Text>–<Text style={pg.bold}>{to}</Text>
          {' '}of <Text style={pg.bold}>{total}</Text>
        </Text>
        <TouchableOpacity style={pg.perPage} onPress={onPickPageSize} activeOpacity={0.7}>
          <Text style={pg.perPageTxt}>{pageSize} / page</Text>
          <Ionicons name="chevron-down" size={12} color={C.textSub} />
        </TouchableOpacity>
      </View>
      <View style={pg.row2}>
        <TouchableOpacity
          style={[pg.navBtn, prevOff && pg.navBtnOff]}
          disabled={prevOff}
          onPress={() => onPageChange(page - 1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={14} color={prevOff ? C.textMuted : C.textSub} />
          <Text style={[pg.navTxt, prevOff && pg.navTxtOff]}>Prev</Text>
        </TouchableOpacity>
        <View style={pg.nums}>
          {pageNums.map((n) => (
            <TouchableOpacity
              key={n}
              style={[pg.numBtn, n === page && pg.numBtnActive]}
              onPress={() => onPageChange(n)}
              activeOpacity={0.7}
            >
              <Text style={[pg.numTxt, n === page && pg.numTxtActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[pg.navBtn, nextOff && pg.navBtnOff]}
          disabled={nextOff}
          onPress={() => onPageChange(page + 1)}
          activeOpacity={0.7}
        >
          <Text style={[pg.navTxt, nextOff && pg.navTxtOff]}>Next</Text>
          <Ionicons name="chevron-forward" size={14} color={nextOff ? C.textMuted : C.textSub} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function InvoiceListScreen() {
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [invoices,       setInvoices]       = useState<Invoice[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [pageTransition, setPageTransition] = useState(false);
  const [loadError,      setLoadError]      = useState(false);
  const [filter,         setFilter]         = useState<FilterKey>('All');
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(DEFAULT_PAGE_SIZE);
  const [total,          setTotal]          = useState(0);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [pageSizeOpen,   setPageSizeOpen]   = useState(false);
  const [counts,         setCounts]         = useState<StatusCounts>({
    all: 0, pending: 0, partially_paid: 0, paid: 0, partially_refunded: 0, refunded: 0,
  });
  const [countsLoaded, setCountsLoaded] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  // Guard against stale async responses + per-query page cache (instant back-nav)
  const fetchSeq  = useRef(0);
  const pageCache = useRef<Map<string, { rows: Invoice[]; total: number }>>(new Map());
  const cacheKey  = (f: FilterKey, p: number, limit: number) => `${f}|${limit}|${p}`;
  const invalidateCache = useCallback(() => pageCache.current.clear(), []);

  // Live refs so the focus effect can read current values without re-subscribing
  // (re-subscribing on every filter/page change would fire duplicate requests).
  const filterRef   = useRef(filter);
  const pageRef     = useRef(page);
  const pageSizeRef = useRef(pageSize);
  filterRef.current   = filter;
  pageRef.current     = page;
  pageSizeRef.current = pageSize;

  // ── Count loader (stable) ──────────────────────────────────────────────────
  const loadCounts = useCallback(async () => {
    try {
      const [allRes, pendingRes, partialRes, paidRes] = await Promise.all([
        invoiceService.list({ limit: 1 }),
        invoiceService.list({ status: 'pending',        limit: 1 }),
        invoiceService.list({ status: 'partially_paid', limit: 1 }),
        invoiceService.list({ status: 'paid',           limit: 1 }),
      ]);
      const tot  = allRes.meta?.total     ?? 0;
      const pend = pendingRes.meta?.total ?? 0;
      const part = partialRes.meta?.total ?? 0;
      const paid = paidRes.meta?.total    ?? 0;
      const ref  = Math.max(0, tot - pend - part - paid);
      setCounts({ all: tot, pending: pend, partially_paid: part, paid, partially_refunded: ref, refunded: ref });
    } catch {
      /* keep zeros on failure */
    } finally {
      setCountsLoaded(true);
    }
  }, []);

  // ── Invoice loader (stable, argument-driven — mirrors PatientListScreen) ────
  const loadInvoices = useCallback(async (
    p = 1,
    f: FilterKey = 'All',
    limit = DEFAULT_PAGE_SIZE,
    refresh = false,
  ) => {
    const seq    = ++fetchSeq.current;
    const key    = cacheKey(f, p, limit);
    const cached = pageCache.current.get(key);

    // Instant render from cache; refresh quietly in the background.
    if (cached && !refresh) {
      setInvoices(cached.rows);
      setTotal(cached.total);
      setPage(p);
      setInitialLoading(false);
    } else if (refresh) {
      setRefreshing(true);
    } else {
      // Keep the existing list visible with a subtle loader instead of blanking.
      setPageTransition(true);
    }

    try {
      const def        = FILTERS.find((d) => d.key === f);
      const clientSide = def?.clientSideOnly ?? false;

      let rows: Invoice[];
      let tot: number;

      if (clientSide) {
        // Backend can't filter these — pull a wide page and paginate locally.
        const res = await invoiceService.list({ page: 1, limit: 200 });
        if (seq !== fetchSeq.current) return;
        const matched = (res.data ?? []).filter((inv) => inv.status === def!.apiStatus);
        tot  = matched.length;
        rows = matched.slice((p - 1) * limit, (p - 1) * limit + limit);
      } else {
        const res = await invoiceService.list({ status: def?.apiStatus, page: p, limit });
        if (seq !== fetchSeq.current) return;
        rows = res.data ?? [];
        tot  = res.meta?.total ?? rows.length;
      }

      setLoadError(false);
      setInvoices(rows);
      setTotal(tot);
      setPage(p);
      pageCache.current.set(key, { rows, total: tot });
    } catch {
      if (seq === fetchSeq.current && p === 1 && !cached) setLoadError(true);
    } finally {
      if (seq === fetchSeq.current) {
        setInitialLoading(false);
        setRefreshing(false);
        setPageTransition(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load on focus ONLY ─────────────────────────────────────────────────────
  // Empty deps → this re-subscribes once and runs whenever the screen gains
  // focus. Filter/page/pageSize changes are handled by direct calls below, so
  // we never fire duplicate requests (which was tripping the API rate limit).
  // Counts are reloaded on focus only — they don't change when switching tabs.
  useFocusEffect(
    useCallback(() => {
      loadInvoices(pageRef.current, filterRef.current, pageSizeRef.current);
      loadCounts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadInvoices, loadCounts])
  );

  // Authoritative per-status count (loaded once, always accurate)
  const countFor = (f: FilterKey): number => {
    switch (f) {
      case 'All':                return counts.all;
      case 'Pending':            return counts.pending;
      case 'Partially Paid':     return counts.partially_paid;
      case 'Paid':               return counts.paid;
      case 'Partially Refunded': return counts.partially_refunded;
      case 'Refunded':           return counts.refunded;
    }
  };

  // ── Handlers (each fires exactly one list request) ─────────────────────────
  const handleFilterChange = (f: FilterKey) => {
    if (f === filter) return;
    setFilter(f);
    setPage(1);
    // Set pagination total instantly from the known status count so the bar is
    // always correct, even if the list request lags or is rate-limited.
    setTotal(countFor(f));
    loadInvoices(1, f, pageSize);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadInvoices(p, filter, pageSize);
  };

  const changePageSize = (n: number) => {
    setPageSize(n);
    setPageSizeOpen(false);
    invalidateCache();
    loadInvoices(1, filter, n);
  };

  const onRefresh = () => {
    invalidateCache();
    loadInvoices(page, filter, pageSize, true);
    loadCounts();
  };

  // ── Client-side search (on the loaded page) ────────────────────────────────
  const visibleInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        `${inv.patient.first_name} ${inv.patient.last_name}`.toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

  const getCount = countFor;

  const iconStyle = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':               return { bg: C.greenLight, icon: C.green };
      case 'pending':            return { bg: C.amberLight, icon: C.amber };
      case 'partially_paid':     return { bg: C.tealLight,  icon: C.teal  };
      case 'partially_refunded': return { bg: C.redLight,   icon: C.red   };
      case 'refunded':           return { bg: C.grayLight,  icon: C.gray  };
      default:                   return { bg: C.indigoLight, icon: C.indigo };
    }
  };

  // ── Row renderer ─────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: Invoice }) => {
    const ic = iconStyle(item.status);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
        style={s.card}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, { backgroundColor: ic.bg }]}>
            <Ionicons name="receipt-outline" size={18} color={ic.icon} />
          </View>

          <View style={s.cardInfo}>
            <Text style={s.invoiceNum} numberOfLines={1}>{item.invoice_number}</Text>
            <Text style={s.patientName} numberOfLines={1}>
              {item.patient.first_name} {item.patient.last_name}
            </Text>
            <View style={s.dateRow}>
              <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
              <Text style={s.dateText}>
                {new Date(item.created_at).toLocaleDateString(getLocale(), {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={s.cardRight}>
            <View style={s.amountItem}>
              <Text style={s.amountLabel}>TOTAL</Text>
              <Text style={s.totalAmt}>{formatCurrency(Number(item.total_amount))}</Text>
            </View>
            <View style={s.amountItem}>
              <Text style={s.amountLabel}>NET AMOUNT</Text>
              <Text style={s.netAmt}>{formatCurrency(Number(item.net_amount))}</Text>
            </View>
            <Badge label={item.status} variant={item.status} showDot={false} size="sm" />
          </View>

          <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Invoices</Text>
          <Text style={s.subtitle}>Manage billing and invoices</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('QuickInvoice', {})}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search invoices by patient or invoice #"
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={s.filterIconBtn} activeOpacity={0.7}>
          <Ionicons name="funnel-outline" size={18} color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersRow}
        contentContainerStyle={s.filtersContent}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count  = getCount(f.key);
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterTab, active && s.filterTabActive]}
              onPress={() => handleFilterChange(f.key)}
              activeOpacity={0.7}
            >
              {!active && <View style={[s.filterDot, { backgroundColor: f.dot }]} />}
              <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{f.key}</Text>
              {countsLoaded && (
                <View style={[s.countBadge, active && s.countBadgeActive]}>
                  <Text style={[s.countBadgeTxt, active && s.countBadgeTxtActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {initialLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.indigo} />
        </View>
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          {pageTransition && <IndeterminateBar />}
          <FlatList
            data={visibleInvoices}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={[{ flex: 1 }, pageTransition && { opacity: 0.55 }]}
            contentContainerStyle={s.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.indigo]} />
            }
            ListEmptyComponent={
              loadError ? (
                <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="alert-circle" />
              ) : (
                <EmptyState
                  title="No invoices"
                  subtitle={searchQuery.trim() ? `No results for "${searchQuery}"` : 'No invoices found'}
                  icon="receipt-outline"
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

      {/* ── Pagination footer ── */}
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

      {/* ── Page size picker ── */}
      <Modal
        visible={pageSizeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPageSizeOpen(false)}
      >
        <Pressable style={s.sheetBackdrop} onPress={() => setPageSizeOpen(false)}>
          <Pressable style={s.actionSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Items per page</Text>
              <Text style={s.sheetSub}>Choose how many invoices to show</Text>
            </View>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                style={s.sheetItem}
                onPress={() => changePageSize(n)}
                activeOpacity={0.7}
              >
                <View style={s.sheetIconBox}>
                  <Text style={s.sheetIconNum}>{n}</Text>
                </View>
                <Text style={s.sheetItemLabel}>{n} per page</Text>
                {n === pageSize && <Ionicons name="checkmark" size={18} color={C.indigo} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.sheetCancel} onPress={() => setPageSizeOpen(false)}>
              <Text style={s.sheetCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Pagination bar styles ────────────────────────────────────────────────────
const pg = StyleSheet.create({
  wrap:        { backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border, gap: 8 },
  row1:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  showing:     { fontSize: 13, color: C.textSub, flexShrink: 1 },
  bold:        { fontWeight: '700', color: C.text },
  perPage:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  perPageTxt:  { fontSize: 12, color: C.text, fontWeight: '600' },
  row2:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  navBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  navBtnOff:   { backgroundColor: C.bg, borderColor: C.divider },
  navTxt:      { fontSize: 13, color: C.textSub, fontWeight: '600' },
  navTxtOff:   { color: C.textMuted },
  nums:        { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  numBtn:      { minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  numBtnActive:{ backgroundColor: C.indigo, borderColor: C.indigo },
  numTxt:      { fontSize: 13, color: C.textSub, fontWeight: '600' },
  numTxtActive:{ color: '#fff' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  topbar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10, backgroundColor: C.bg },
  iconBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  titleBlock: { flex: 1 },
  title:      { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle:   { fontSize: 11, color: C.textSub, marginTop: 1 },
  addBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center', shadowColor: C.indigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  searchWrap:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 10, backgroundColor: C.bg },
  searchBox:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  searchInput:   { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  filterIconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  filtersRow:     { flexGrow: 0, backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  filtersContent: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterTab:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: C.bg, gap: 5 },
  filterTabActive:{ backgroundColor: C.indigo },
  filterDot:      { width: 6, height: 6, borderRadius: 3 },
  filterTabText:  { fontSize: 13, fontWeight: '500', color: C.textSub },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },

  countBadge:       { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center', justifyContent: 'center' },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.9)' },
  countBadgeTxt:    { fontSize: 11, fontWeight: '700', color: C.textSub },
  countBadgeTxtActive: { color: C.indigo },

  list:   { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: C.indigoLight, zIndex: 10, overflow: 'hidden' },
  progressFill:  { height: '100%', width: '40%', backgroundColor: C.indigo },

  card:        { backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo:    { flex: 1, gap: 2 },
  invoiceNum:  { fontSize: 11, fontWeight: '700', color: C.indigo, letterSpacing: 0.3 },
  patientName: { fontSize: 14, fontWeight: '700', color: C.text },
  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText:    { fontSize: 11, color: C.textMuted },
  cardRight:   { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  amountItem:  { alignItems: 'flex-end' },
  amountLabel: { fontSize: 9, fontWeight: '600', color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  totalAmt:    { fontSize: 12, fontWeight: '600', color: C.textSub },
  netAmt:      { fontSize: 14, fontWeight: '800', color: C.text },

  pagFooter: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  actionSheet:   { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 6 },
  sheetHeader:   { paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider, marginBottom: 4 },
  sheetTitle:    { fontSize: 16, fontWeight: '700', color: C.text },
  sheetSub:      { fontSize: 12, color: C.textSub, marginTop: 2 },
  sheetItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 12 },
  sheetIconBox:  { width: 38, height: 38, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  sheetIconNum:  { color: C.indigo, fontSize: 14, fontWeight: '700' },
  sheetItemLabel:{ fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
  sheetCancel:   { backgroundColor: C.bg, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sheetCancelTxt:{ fontSize: 14, fontWeight: '700', color: C.textSub },
});
