import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  platformBillingService,
  type PlatformInvoice,
} from '../../services/platformBilling.service';
import { formatCurrency } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import EmptyState from '../../components/EmptyState';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', bg: '#F8FAFC', surface: '#fff', text: '#0f172a',
  textMuted: '#94a3b8', border: '#E2E8F0', green: '#059669', red: '#dc2626', amber: '#d97706',
};

function statusStyle(status: string) {
  if (status === 'paid') return { bg: '#DCFCE7', fg: C.green };
  if (status === 'overdue') return { bg: '#FEE2E2', fg: C.red };
  if (status === 'due') return { bg: '#FEF3C7', fg: C.amber };
  return { bg: '#F1F5F9', fg: '#64748b' };
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PlatformInvoiceListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const [items, setItems] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await platformBillingService.list({ limit: 50, offset: 0 });
      setItems(res.items ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onPay = async (inv: PlatformInvoice) => {
    setPayingId(inv.id);
    try {
      const { url } = await platformBillingService.getPayLink(inv.id);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Payment', e instanceof Error ? e.message : 'Could not open payment link.');
    } finally {
      setPayingId(null);
    }
  };

  const onPdf = async (inv: PlatformInvoice) => {
    try {
      const { url } = await platformBillingService.getPdfUrl(inv.id);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('PDF', e instanceof Error ? e.message : 'Could not open invoice PDF.');
    }
  };

  const renderItem = ({ item }: { item: PlatformInvoice }) => {
    const st = statusStyle(item.status);
    const canPay = item.status === 'due' || item.status === 'overdue';
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.invNo}>{item.invoice_number}</Text>
            <Text style={s.meta} numberOfLines={1}>
              {item.plan_name} · {item.billing_cycle}
            </Text>
            <Text style={s.meta}>
              {formatDate(item.period_start)} – {formatDate(item.period_end)}
            </Text>
          </View>
          <View style={[s.pill, { backgroundColor: st.bg }]}>
            <Text style={[s.pillTxt, { color: st.fg }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={s.amount}>{formatCurrency(Number(item.total_amount))}</Text>
        <View style={s.actions}>
          {canPay && (
            <TouchableOpacity
              style={s.payBtn}
              onPress={() => onPay(item)}
              disabled={payingId === item.id}
            >
              {payingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={14} color="#fff" />
                  <Text style={s.payTxt}>Pay now</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.outlineBtn} onPress={() => onPdf(item)}>
            <Ionicons name="document-text-outline" size={14} color={C.indigo} />
            <Text style={s.outlineTxt}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>Subscription invoices</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={[s.list, { paddingBottom: 16 + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
          ListEmptyComponent={
            <EmptyState title="No invoices yet" subtitle="Platform tax invoices appear here after billing runs." icon="receipt-outline" />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, gap: 8 },
  cardTop: { flexDirection: 'row', gap: 10 },
  invNo: { fontSize: 14, fontWeight: '800', color: C.text },
  meta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  pillTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  amount: { fontSize: 18, fontWeight: '800', color: C.text },
  actions: { flexDirection: 'row', gap: 8 },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.indigo, paddingVertical: 10, borderRadius: 10 },
  payTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  outlineTxt: { color: C.indigo, fontWeight: '600', fontSize: 13 },
});
