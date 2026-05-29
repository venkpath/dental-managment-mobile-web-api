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
import { expenseService } from '../../services/expense.service';
import { formatCurrency, getLocale } from '../../utils/format';
import { expensePaymentModeLabel, PAYMENT_MODE_FILTERS } from '../../utils/expensePaymentMode';
import EmptyState from '../../components/EmptyState';
import {
  PaginationBar,
  PageSizeSheet,
  IndeterminateBar,
  DEFAULT_PAGE_SIZE,
} from '../../components/Pagination';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import { useAuthStore } from '../../store/auth.store';
import { canManageExpenses, canDeleteExpenses } from '../../utils/permissions';
import { radius } from '../../theme';
import type { Expense, ExpenseCategory, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  red: '#dc2626', redLight: '#fee2e2',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  gray: '#64748b', grayLight: '#f1f5f9',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#f1f5f9',
};

const QUERY_DEBOUNCE_MS = 350;

function cacheKey(
  catId: string | null,
  payKey: string,
  search: string,
  p: number,
  limit: number,
) {
  return `${catId ?? ''}|${payKey}|${search.trim().toLowerCase()}|${p}|${limit}`;
}

export default function ExpenseListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const { user } = useAuthStore();
  const showAdd = canManageExpenses(user?.role);
  const showCategories = showAdd;

  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchSeq = useRef(0);
  const pageCache = useRef<Map<string, { rows: Expense[]; total: number }>>(new Map());
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoriesOnce = useRef(false);

  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const searchRef = useRef(searchQuery);
  const categoryRef = useRef(categoryId);
  const paymentRef = useRef(paymentFilter);
  pageRef.current = page;
  pageSizeRef.current = pageSize;
  searchRef.current = searchQuery;
  categoryRef.current = categoryId;
  paymentRef.current = paymentFilter;

  const cancelScheduledReload = () => {
    if (reloadTimer.current) {
      clearTimeout(reloadTimer.current);
      reloadTimer.current = null;
    }
  };

  const invalidateCache = useCallback(() => pageCache.current.clear(), []);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await expenseService.getCategories();
      setCategories(cats.filter((c) => c.is_active));
    } catch {
      setCategories([]);
    }
  }, []);

  const load = useCallback(async (
    p = 1,
    limit = DEFAULT_PAGE_SIZE,
    search = '',
    catId: string | null = null,
    payKey = 'all',
    refresh = false,
  ) => {
    const seq = ++fetchSeq.current;
    const key = cacheKey(catId, payKey, search, p, limit);
    const cached = pageCache.current.get(key);
    const payDef = PAYMENT_MODE_FILTERS.find((f) => f.key === payKey);

    if (cached && !refresh) {
      setItems(cached.rows);
      setTotal(cached.total);
      setPage(p);
      setLoadError(false);
      setRateLimited(false);
      setInitialLoading(false);
    } else if (refresh) {
      setRefreshing(true);
    } else {
      setPageTransition(true);
    }

    try {
      const res = await expenseService.list({
        page: p,
        limit,
        search: search.trim() || undefined,
        category_id: catId ?? undefined,
        payment_mode: payDef?.mode,
      });
      if (seq !== fetchSeq.current) return;
      const rows = res.data ?? [];
      const tot = res.meta?.total ?? rows.length;
      setLoadError(false);
      setRateLimited(false);
      setItems(rows);
      setTotal(tot);
      setPage(p);
      pageCache.current.set(key, { rows, total: tot });
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const limited = msg.includes('rate') || msg.includes('too many');
      setRateLimited(limited);
      if (p === 1 && !cached) {
        setLoadError(true);
      }
    } finally {
      if (seq === fetchSeq.current) {
        setInitialLoading(false);
        setRefreshing(false);
        setPageTransition(false);
      }
    }
  }, []);

  /** Debounced reload for search + filters — one request per burst of changes. */
  const scheduleQueryReload = useCallback(() => {
    cancelScheduledReload();
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      setPage(1);
      load(
        1,
        pageSizeRef.current,
        searchRef.current,
        categoryRef.current,
        paymentRef.current,
      );
    }, QUERY_DEBOUNCE_MS);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!categoriesOnce.current) {
        categoriesOnce.current = true;
        loadCategories();
      }
      cancelScheduledReload();
      load(
        pageRef.current,
        pageSizeRef.current,
        searchRef.current,
        categoryRef.current,
        paymentRef.current,
      );
    }, [load, loadCategories]),
  );

  const applyCategory = (id: string | null) => {
    if (id === categoryId) return;
    categoryRef.current = id;
    setCategoryId(id);
    setPage(1);
    scheduleQueryReload();
  };

  const applyPayment = (key: string) => {
    if (key === paymentFilter) return;
    paymentRef.current = key;
    setPaymentFilter(key);
    setPage(1);
    scheduleQueryReload();
  };

  const onSearchChange = (text: string) => {
    searchRef.current = text;
    setSearchQuery(text);
    setPage(1);
    scheduleQueryReload();
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    cancelScheduledReload();
    load(p, pageSize, searchQuery, categoryId, paymentFilter);
  };

  const changePageSize = (n: number) => {
    setPageSize(n);
    setPageSizeOpen(false);
    pageSizeRef.current = n;
    cancelScheduledReload();
    invalidateCache();
    setPage(1);
    load(1, n, searchQuery, categoryId, paymentFilter);
  };

  const onRefresh = () => {
    cancelScheduledReload();
    invalidateCache();
    load(page, pageSize, searchQuery, categoryId, paymentFilter, true);
  };

  const renderItem = useCallback(({ item }: { item: Expense }) => {
    const dateStr = new Date(item.date).toLocaleDateString(getLocale(), {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ExpenseDetail', { expenseId: item.id })}
        style={s.card}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, { backgroundColor: C.redLight }]}>
            <Ionicons name="card" size={20} color={C.red} />
          </View>
          <View style={s.cardInfo}>
            <Text style={s.title} numberOfLines={1}>{item.title}</Text>
            {item.vendor ? (
              <Text style={s.vendor} numberOfLines={1}>{item.vendor}</Text>
            ) : null}
            <View style={s.metaRow}>
              <Ionicons name="pricetag-outline" size={11} color={C.violet} />
              <Text style={s.catText} numberOfLines={1}>{item.category?.name ?? 'Uncategorized'}</Text>
              <Text style={s.dot}>·</Text>
              <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
              <Text style={s.dateText}>{dateStr}</Text>
            </View>
          </View>
          <View style={s.cardRight}>
            <Text style={s.amount}>{formatCurrency(Number(item.amount))}</Text>
            {item.payment_mode ? (
              <View style={s.payPill}>
                <Text style={s.payPillTxt}>{expensePaymentModeLabel(item.payment_mode)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  const emptySubtitle = rateLimited
    ? 'Too many requests — wait a moment and pull to refresh'
    : loadError
      ? 'Pull down to retry'
      : searchQuery.trim()
        ? `No results for "${searchQuery}"`
        : 'No expenses match your filters';

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.heading}>Expenses</Text>
          <Text style={s.subtitle}>Clinic spending & records</Text>
        </View>
        {showCategories ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpenseCategories')}
            style={s.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="pricetags-outline" size={20} color={C.textSub} />
          </TouchableOpacity>
        ) : null}
        {showAdd ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('AddExpense')}
            style={s.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={C.indigo} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={() => navigation.navigate('ExpenseAdvisor')}
          style={s.spendlyBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={18} color={C.violet} />
          <Text style={s.spendlyTxt}>Spendly</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search title or vendor"
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersRow}
        contentContainerStyle={s.filtersContent}
      >
        <TouchableOpacity
          style={[s.filterTab, !categoryId && s.filterTabActive]}
          onPress={() => applyCategory(null)}
          activeOpacity={0.7}
        >
          <Text style={[s.filterTabText, !categoryId && s.filterTabTextActive]}>All categories</Text>
        </TouchableOpacity>
        {categories.map((cat) => {
          const active = categoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[s.filterTab, active && s.filterTabActive]}
              onPress={() => applyCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterTabText, active && s.filterTabTextActive]} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersRow2}
        contentContainerStyle={s.filtersContent}
      >
        {PAYMENT_MODE_FILTERS.map((f) => {
          const active = paymentFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterTab, active && s.filterTabActive]}
              onPress={() => applyPayment(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{f.label}</Text>
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
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={[{ flex: 1 }, pageTransition && { opacity: 0.55 }]}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.indigo]} />}
            ListEmptyComponent={
              loadError || rateLimited ? (
                <EmptyState
                  title={rateLimited ? 'Slow down' : 'Failed to load'}
                  subtitle={emptySubtitle}
                  icon="alert-circle"
                />
              ) : (
                <EmptyState
                  title="No expenses"
                  subtitle={emptySubtitle}
                  icon="card-outline"
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
        noun="expenses"
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
  heading: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  spendlyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: C.violetLight, borderWidth: 1, borderColor: '#ddd6fe' },
  spendlyTxt: { fontSize: 12, fontWeight: '700', color: C.violet },
  searchWrap: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.bg },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  filtersRow: { flexGrow: 0, backgroundColor: C.surface, borderTopWidth: 1, borderColor: C.border },
  filtersRow2: { flexGrow: 0, backgroundColor: C.surface, borderBottomWidth: 1, borderColor: C.border },
  filtersContent: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: C.bg, maxWidth: 200 },
  filterTabActive: { backgroundColor: C.indigo },
  filterTabText: { fontSize: 12, fontWeight: '500', color: C.textSub },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  vendor: { fontSize: 12, fontWeight: '600', color: C.textSub },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  catText: { fontSize: 11, fontWeight: '600', color: C.violet, maxWidth: 120 },
  dot: { fontSize: 11, color: C.textMuted },
  dateText: { fontSize: 11, color: C.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  amount: { fontSize: 16, fontWeight: '800', color: C.red },
  payPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: C.grayLight },
  payPillTxt: { fontSize: 10, fontWeight: '700', color: C.gray },
  pagFooter: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
});
