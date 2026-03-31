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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, typography, radius } from '../../theme';
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

  const loadInvoices = useCallback(async (f: Filter = filter) => {
    setLoading(true);
    try {
      const res = await invoiceService.list({ status: filterToStatus[f] });
      setInvoices(res.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices(filter);
    }, [filter])
  );

  const renderItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
    >
      <Card style={styles.card} padding={spacing.md}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
            <Text style={styles.patientName}>
              {item.patient.first_name} {item.patient.last_name}
            </Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.amount}>₹{Number(item.net_amount).toLocaleString('en-IN')}</Text>
            <Badge label={item.status} variant={item.status} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Filters + New Invoice button */}
      <View style={styles.topBar}>
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
        <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('QuickInvoice', {})}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInvoices(filter); }} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState title="No invoices" subtitle="Create your first invoice" icon="🧾" />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filters: { flexDirection: 'row', flex: 1, gap: spacing.xs },
  filterTab: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  filterTabActive: { backgroundColor: colors.primary },
  filterText: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.white, fontWeight: '700' },
  newBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  newBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.sm },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing['2xl'] },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  invoiceNum: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  patientName: { fontSize: typography.base, fontWeight: '600', color: colors.text, marginTop: 2 },
  date: { fontSize: typography.xs, color: colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  amount: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
