import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { expenseService } from '../../services/expense.service';
import { formatCurrency, getLocale } from '../../utils/format';
import { expensePaymentModeLabel } from '../../utils/expensePaymentMode';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useAuthStore } from '../../store/auth.store';
import { canManageExpenses } from '../../utils/permissions';
import type { Expense, BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'ExpenseDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  red: '#dc2626', redLight: '#fee2e2',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  green: '#059669', greenLight: '#d1fae5',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6', grayLight: '#f1f5f9',
};

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap }) {
  if (!value || value === '—') return null;
  return (
    <View style={s.row}>
      {icon ? (
        <View style={s.rowIcon}>
          <Ionicons name={icon} size={16} color={C.indigo} />
        </View>
      ) : null}
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ExpenseDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { expenseId } = route.params;
  const { user } = useAuthStore();
  const showEdit = canManageExpenses(user?.role);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    expenseService.get(expenseId)
      .then((e) => { setExpense(e); setLoadError(false); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [expenseId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const openReceipt = () => {
    const url = expense?.receipt_url;
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  const dateStr = expense
    ? new Date(expense.date).toLocaleDateString(getLocale(), {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const recurringLabel = expense?.is_recurring && expense.recurring_frequency
    ? expense.recurring_frequency.charAt(0).toUpperCase() + expense.recurring_frequency.slice(1)
    : null;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Expense</Text>
        {showEdit ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditExpense', { expenseId })}
            style={s.hBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={C.indigo} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpenseAdvisor')}
            style={s.hBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={20} color={C.violet} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : loadError || !expense ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={C.textMuted} />
          <Text style={s.errTitle}>Could not load expense</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroCard}>
            <View style={[s.heroIcon, { backgroundColor: C.redLight }]}>
              <Ionicons name="card" size={28} color={C.red} />
            </View>
            <Text style={s.heroTitle}>{expense.title}</Text>
            <Text style={s.heroAmount}>{formatCurrency(Number(expense.amount))}</Text>
            <View style={s.heroPills}>
              <View style={[s.pill, { backgroundColor: C.indigoLight }]}>
                <Text style={[s.pillTxt, { color: C.indigo }]}>{expense.category?.name ?? 'Uncategorized'}</Text>
              </View>
              {expense.payment_mode ? (
                <View style={[s.pill, { backgroundColor: C.grayLight }]}>
                  <Text style={[s.pillTxt, { color: C.textSub }]}>
                    {expensePaymentModeLabel(expense.payment_mode)}
                  </Text>
                </View>
              ) : null}
              {recurringLabel ? (
                <View style={[s.pill, { backgroundColor: C.greenLight }]}>
                  <Text style={[s.pillTxt, { color: C.green }]}>Recurring · {recurringLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Details</Text>
            <DetailRow label="Date" value={dateStr} icon="calendar-outline" />
            <DetailRow label="Vendor" value={expense.vendor ?? '—'} icon="storefront-outline" />
            <DetailRow label="Branch" value={expense.branch?.name ?? '—'} icon="business-outline" />
            <DetailRow label="Recorded by" value={expense.user?.name ?? '—'} icon="person-outline" />
            {expense.notes ? (
              <View style={s.notesBlock}>
                <Text style={s.rowLabel}>Notes</Text>
                <Text style={s.notesText}>{expense.notes}</Text>
              </View>
            ) : null}
          </View>

          {expense.receipt_url ? (
            <TouchableOpacity style={s.receiptBtn} onPress={openReceipt} activeOpacity={0.7}>
              <Ionicons name="document-attach-outline" size={20} color={C.indigo} />
              <Text style={s.receiptTxt}>View receipt</Text>
              <Ionicons name="open-outline" size={16} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={s.advisorCard}
            onPress={() => navigation.navigate('ExpenseAdvisor')}
            activeOpacity={0.85}
          >
            <View style={s.advisorIcon}>
              <Ionicons name="sparkles" size={22} color={C.violet} />
            </View>
            <View style={s.advisorBody}>
              <Text style={s.advisorTitle}>Ask Spendly</Text>
              <Text style={s.advisorSub}>
                Get spending insights grounded in your clinic's expense data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  hBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errTitle: { fontSize: 15, fontWeight: '600', color: C.textSub },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: C.indigo },
  retryTxt: { color: '#fff', fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  heroCard: { backgroundColor: C.surface, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center' },
  heroAmount: { fontSize: 28, fontWeight: '800', color: C.red, marginTop: 6 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillTxt: { fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: C.text },
  notesBlock: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: C.divider },
  notesText: { fontSize: 14, color: C.textSub, lineHeight: 20 },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  receiptTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: C.indigo },
  advisorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.violetLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ddd6fe' },
  advisorIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  advisorBody: { flex: 1, gap: 4 },
  advisorTitle: { fontSize: 15, fontWeight: '800', color: C.violet },
  advisorSub: { fontSize: 12, color: C.textSub, lineHeight: 17 },
});
