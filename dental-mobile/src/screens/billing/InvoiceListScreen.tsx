import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Invoice, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const FILTERS = ['All', 'Pending', 'Paid', 'Partial'] as const;
type Filter = typeof FILTERS[number];

const filterToStatus: Record<Filter, string | undefined> = {
  All: undefined,
  Pending: 'pending',
  Paid: 'paid',
  Partial: 'partially_paid',
};

export default function InvoiceListScreen() {
  const navigation = useNavigation<Nav>();
  const bottomInset = useBottomInset();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInvoices = useCallback(async (f: Filter = filter, p = 1) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await invoiceService.list({ status: filterToStatus[f], page: p });
      const items = res.data || [];
      setInvoices(p === 1 ? items : (prev) => [...prev, ...items]);
      setHasMore(p < (res.meta?.totalPages ?? 1));
      setPage(p);
    } catch {
      if (p === 1) Alert.alert('Error', 'Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices(filter, 1);
    }, [filter])
  );

  const onLoadMore = () => {
    if (!loadingMore && hasMore) loadInvoices(filter, page + 1);
  };

  const renderItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.iconCol}>
          <View style={[styles.invoiceIcon, {
            backgroundColor: item.status === 'paid' ? colors.successLight : item.status === 'pending' ? colors.warningLight : colors.primaryLight,
          }]}>
            <Ionicons
              name="receipt-outline"
              size={18}
              color={item.status === 'paid' ? colors.success : item.status === 'pending' ? colors.warning : colors.primary}
            />
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
          <Text style={styles.patientName}>
            {item.patient.first_name} {item.patient.last_name}
          </Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>₹{Number(item.net_amount).toLocaleString('en-IN')}</Text>
          <Badge label={item.status} variant={item.status} showDot={false} size="sm" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invoices</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('QuickInvoice', {})}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
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
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInvoices(filter, 1); }} colors={[colors.primary]} />}
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
              : invoices.length > 0
              ? <Text style={styles.endText}>All invoices loaded</Text>
              : null
          }
          ListEmptyComponent={<EmptyState title="No invoices" subtitle="Create your first invoice" icon="receipt-outline" />}
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
  newBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    ...shadow.colored(colors.primary),
  },
  newBtnText: { color: colors.white, fontWeight: '600', fontSize: typography.sm },
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
  filterTabActive: { backgroundColor: colors.primary },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCol: {},
  invoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  invoiceNum: { fontSize: typography.xs, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  patientName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  date: { fontSize: typography.xs, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: spacing.sm },
  amount: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
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
