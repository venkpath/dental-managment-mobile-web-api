import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
  Alert, Modal, Pressable, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  paymentService,
  type PlanWithFeatures,
  type SubscriptionStatus,
} from '../../services/payment.service';
import {
  platformBillingService,
  type PlatformInvoice,
} from '../../services/platformBilling.service';
import { formatCurrency } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import { useAuthStore } from '../../store/auth.store';
import { refreshSubscription } from '../../store/subscription.store';
import { canManageClinicBilling } from '../../utils/clinicRoles';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF', violet: '#7C3AED', violetLight: '#EDE9FE',
  violetBorder: '#DDD6FE', bg: '#F8FAFC', surface: '#ffffff', text: '#0f172a',
  textSub: '#475569', textMuted: '#94a3b8', border: '#E2E8F0', red: '#dc2626',
  redLight: '#FEE2E2', amber: '#d97706', amberLight: '#FEF3C7', green: '#059669',
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status: SubscriptionStatus) {
  const s = status.subscription_status;
  if (s === 'active') return { label: 'Active', bg: '#DCFCE7', fg: C.green };
  if (s === 'trial') {
    return status.is_trial_active
      ? { label: `Trial · ${status.trial_days_left}d left`, bg: '#DBEAFE', fg: '#1d4ed8' }
      : { label: 'Trial expired', bg: C.redLight, fg: C.red };
  }
  if (s === 'created') return { label: 'Payment pending', bg: C.amberLight, fg: C.amber };
  if (s === 'cancelled') return { label: 'Cancelled', bg: C.redLight, fg: C.red };
  if (s === 'expired') return { label: 'Expired', bg: C.redLight, fg: C.red };
  return { label: s, bg: '#F1F5F9', fg: '#64748b' };
}

export default function ClinicBillingScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const user = useAuthStore((s) => s.user);
  const canManageBilling = canManageClinicBilling(user?.role);

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [outstanding, setOutstanding] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [subscribing, setSubscribing] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canManageBilling) {
      setLoading(false);
      return;
    }
    try {
      const st = await paymentService.getStatus();
      setStatus(st);
      await refreshSubscription();
      try {
        const due = await platformBillingService.listOutstanding();
        setOutstanding(due ?? []);
      } catch {
        // Same as web: platform invoice routes may be role-restricted; subscription still loads via /payment/*
        setOutstanding([]);
      }
    } catch (e) {
      Alert.alert('Billing', e instanceof Error ? e.message : 'Could not load billing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManageBilling]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openPlans = async () => {
    setPlansOpen(true);
    setPlansLoading(true);
    try {
      const list = await paymentService.getPlans();
      setPlans(list.filter((p) => Number(p.price_monthly) > 0 || p.name.toLowerCase() !== 'free'));
      if (status?.billing_cycle) setBillingCycle(status.billing_cycle);
    } catch {
      Alert.alert('Plans', 'Could not load plans.');
      setPlansOpen(false);
    } finally {
      setPlansLoading(false);
    }
  };

  const subscribe = async (plan: PlanWithFeatures) => {
    const cycle =
      billingCycle === 'yearly' && plan.price_yearly != null && plan.price_yearly > 0
        ? 'yearly'
        : 'monthly';
    setSubscribing(true);
    try {
      const result = await paymentService.subscribe(plan.name, {
        planId: plan.id,
        billingCycle: cycle,
        changeEffective: status?.subscription_status === 'active' ? 'cycle_end' : 'now',
      });
      setPlansOpen(false);
      if (result.shortUrl) {
        Alert.alert(
          'Complete payment',
          'You will be redirected to Razorpay to complete subscription. Return here and pull to refresh when done.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => Linking.openURL(result.shortUrl) },
          ],
        );
      } else {
        Alert.alert('Subscription', 'Checkout link was not returned. Try again or use the web portal.');
      }
    } catch (e) {
      Alert.alert('Subscribe failed', e instanceof Error ? e.message : 'Could not start checkout.');
    } finally {
      setSubscribing(false);
    }
  };

  const onCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      status?.current_period_end
        ? `Access continues until ${formatDate(status.current_period_end)}. After that you must resubscribe.`
        : 'Your clinic will lose access when the current period ends.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentService.cancel();
              Alert.alert('Cancelled', 'Subscription cancelled.');
              load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Cancel failed.');
            }
          },
        },
      ],
    );
  };

  const onPayInvoice = async (inv: PlatformInvoice) => {
    setPayingId(inv.id);
    try {
      const { url } = await platformBillingService.getPayLink(inv.id);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Pay', e instanceof Error ? e.message : 'Could not open payment.');
    } finally {
      setPayingId(null);
    }
  };

  const showUpgradePrompt =
    status &&
    ((status.subscription_status === 'trial' && !status.is_trial_active) ||
      status.subscription_status === 'expired' ||
      status.subscription_status === 'cancelled');

  const isActive = status?.subscription_status === 'active';
  const badge = status ? statusBadge(status) : null;

  if (!canManageBilling) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Header onMenu={openDrawer} onBack={() => navigation.goBack()} />
        <View style={s.adminOnly}>
          <Ionicons name="lock-closed-outline" size={40} color={C.textMuted} />
          <Text style={s.adminTitle}>Billing access restricted</Text>
          <Text style={s.adminSub}>
            Subscription and payments can only be managed by a clinic Admin or Super Admin account.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <Header onMenu={openDrawer} onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.indigo} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scroll, { paddingBottom: 24 + bottomInset }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[C.indigo]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Outstanding */}
          {outstanding.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>Payment due</Text>
              {outstanding.map((inv) => (
                <View key={inv.id} style={s.dueCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dueInv}>{inv.invoice_number}</Text>
                    <Text style={s.dueMeta}>{inv.plan_name} · due {formatDate(inv.due_date)}</Text>
                  </View>
                  <Text style={s.dueAmt}>{formatCurrency(Number(inv.total_amount))}</Text>
                  <TouchableOpacity
                    style={s.duePay}
                    onPress={() => onPayInvoice(inv)}
                    disabled={payingId === inv.id}
                  >
                    {payingId === inv.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.duePayTxt}>Pay</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Subscription card */}
          <View style={[s.subCard, showUpgradePrompt && s.subCardAlert]}>
            <View style={s.subHead}>
              <Text style={s.subTitle}>Subscription</Text>
              {badge && (
                <View style={[s.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[s.badgeTxt, { color: badge.fg }]}>{badge.label}</Text>
                </View>
              )}
            </View>

            <View style={s.planHero}>
              <View style={{ flex: 1 }}>
                <Text style={s.planLabel}>CURRENT PLAN</Text>
                <Text style={s.planName}>{status?.plan?.name ?? 'Free trial'}</Text>
                {status?.billing_cycle && (
                  <Text style={s.planCycle}>{status.billing_cycle} billing</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.planLabel}>
                  {status?.billing_cycle === 'yearly' ? 'PER YEAR' : 'PER MONTH'}
                </Text>
                <Text style={s.planPrice}>
                  {status?.effective_price != null
                    ? formatCurrency(status.effective_price)
                    : status?.plan
                      ? formatCurrency(
                          status.billing_cycle === 'yearly' && status.plan.price_yearly
                            ? Number(status.plan.price_yearly)
                            : Number(status.plan.price_monthly),
                        )
                      : '—'}
                </Text>
                {status?.price_source === 'custom' && (
                  <Text style={s.promoTag}>Promo pricing</Text>
                )}
              </View>
            </View>

            <View style={s.detailGrid}>
              <DetailCell
                icon="calendar-outline"
                label="Period"
                value={
                  status?.current_period_start
                    ? `${formatDate(status.current_period_start)} – ${formatDate(status.current_period_end)}`
                    : status?.trial_ends_at
                      ? `Trial ends ${formatDate(status.trial_ends_at)}`
                      : '—'
                }
              />
              <DetailCell
                icon="refresh-outline"
                label="Next renewal"
                value={status?.next_charge_at ? formatDate(status.next_charge_at) : isActive ? 'Auto-renews' : '—'}
              />
              <DetailCell
                icon="card-outline"
                label="Payments"
                value={
                  status && status.paid_count > 0
                    ? `${status.paid_count} of ${status.total_count}`
                    : '—'
                }
              />
              <DetailCell
                icon="time-outline"
                label={status?.ended_at ? 'Ended' : 'Started'}
                value={formatDate(status?.ended_at ?? status?.started_at)}
              />
            </View>

            {status?.subscription_status === 'trial' && status.is_trial_active && status.trial_days_left <= 5 && (
              <View style={s.warnBox}>
                <Ionicons name="alert-circle" size={18} color={C.amber} />
                <Text style={s.warnTxt}>
                  Trial expires in <Text style={{ fontWeight: '800' }}>{status.trial_days_left} days</Text>. Subscribe to avoid interruption.
                </Text>
              </View>
            )}

            {showUpgradePrompt && (
              <View style={[s.warnBox, s.warnBoxRed]}>
                <Ionicons name="alert-circle" size={18} color={C.red} />
                <Text style={[s.warnTxt, { color: '#991b1b' }]}>
                  {status?.subscription_status === 'trial' && !status.is_trial_active
                    ? 'Your free trial has ended. Choose a plan to continue.'
                    : 'Subscription inactive. Choose a plan to restore access.'}
                </Text>
              </View>
            )}

            <View style={s.actions}>
              <TouchableOpacity style={s.primaryBtn} onPress={openPlans} activeOpacity={0.85}>
                <LinearGradient colors={['#4361EE', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryGrad}>
                  <Ionicons name="ribbon" size={16} color="#fff" />
                  <Text style={s.primaryTxt}>
                    {showUpgradePrompt ? 'Subscribe now' : isActive ? 'Change plan' : 'Upgrade plan'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {isActive && status?.subscription_id && (
                <TouchableOpacity style={s.outlineBtn} onPress={onCancel}>
                  <Text style={s.outlineDanger}>Cancel subscription</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick links */}
          <TouchableOpacity
            style={s.linkCard}
            onPress={() => navigation.navigate('PlatformInvoices')}
            activeOpacity={0.75}
          >
            <View style={s.linkIcon}><Ionicons name="receipt-outline" size={20} color={C.indigo} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.linkTitle}>Invoice history</Text>
              <Text style={s.linkSub}>Platform tax invoices & PDFs</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>

          <View style={s.tipCard}>
            <Ionicons name="information-circle-outline" size={18} color={C.indigo} />
            <Text style={s.tipTxt}>
              Patient invoices and expenses are under More → Invoices / Expenses. This screen is for your Smart Dental Desk subscription only.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Plan picker modal */}
      <Modal visible={plansOpen} transparent animationType="slide" onRequestClose={() => setPlansOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setPlansOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Choose a plan</Text>
            <Text style={s.sheetSub}>Paid plans include a 14-day trial. Payment opens in Razorpay.</Text>

            <View style={s.cycleToggle}>
              {(['monthly', 'yearly'] as const).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.cycleBtn, billingCycle === c && s.cycleBtnOn]}
                  onPress={() => setBillingCycle(c)}
                >
                  <Text style={[s.cycleTxt, billingCycle === c && s.cycleTxtOn]}>
                    {c === 'monthly' ? 'Monthly' : 'Yearly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {plansLoading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={C.indigo} />
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {plans.map((plan) => {
                  const isPopular = plan.name.toLowerCase() === 'standard';
                  const isCurrent = isActive && status?.plan?.name === plan.name;
                  const price =
                    billingCycle === 'yearly' && plan.price_yearly
                      ? Number(plan.price_yearly)
                      : Number(plan.price_monthly);
                  return (
                    <View
                      key={plan.id}
                      style={[s.planCard, isPopular && s.planCardPopular, isCurrent && s.planCardCurrent]}
                    >
                      {isPopular && <Text style={s.popularTag}>Most popular</Text>}
                      <Text style={s.planCardName}>{plan.name}</Text>
                      <Text style={s.planCardPrice}>
                        {formatCurrency(price)}
                        <Text style={s.planCardPeriod}>
                          {billingCycle === 'yearly' ? '/year' : '/month'}
                        </Text>
                      </Text>
                      <Text style={s.planCardMeta}>
                        {plan.max_branches} branches · {plan.max_staff} staff · AI {plan.ai_quota}/mo
                      </Text>
                      <TouchableOpacity
                        style={[s.planSelectBtn, isCurrent && { opacity: 0.5 }]}
                        disabled={isCurrent || subscribing}
                        onPress={() => subscribe(plan)}
                      >
                        {subscribing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={s.planSelectTxt}>{isCurrent ? 'Current plan' : 'Select'}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Header({ onMenu, onBack }: { onMenu: () => void; onBack: () => void }) {
  return (
    <View style={s.topbar}>
      <TouchableOpacity onPress={onMenu} style={s.iconBtn}>
        <Ionicons name="menu" size={22} color={C.text} />
      </TouchableOpacity>
      <View style={s.titleBlock}>
        <View style={s.titleRow}>
          <Ionicons name="card" size={18} color={C.indigo} />
          <Text style={s.title}>Billing & Subscription</Text>
        </View>
        <Text style={s.subtitle}>Your clinic plan & payments</Text>
      </View>
      <TouchableOpacity onPress={onBack} style={s.iconBtn}>
        <Ionicons name="arrow-back" size={20} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

function DetailCell({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={s.detailCell}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  titleBlock: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 2 },

  adminOnly: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  adminTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  adminSub: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },

  block: { gap: 8 },
  blockTitle: { fontSize: 13, fontWeight: '800', color: C.red },
  dueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.redLight,
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fecaca',
  },
  dueInv: { fontSize: 13, fontWeight: '800', color: C.text },
  dueMeta: { fontSize: 11, color: C.textSub },
  dueAmt: { fontSize: 13, fontWeight: '800', color: C.text },
  duePay: { backgroundColor: C.indigo, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 48, alignItems: 'center' },
  duePayTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

  subCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: C.border, gap: 14,
  },
  subCardAlert: { borderColor: '#fecaca' },
  subHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  planHero: {
    flexDirection: 'row', gap: 12, backgroundColor: C.violetLight,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.violetBorder,
  },
  planLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },
  planName: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 2 },
  planCycle: { fontSize: 11, color: C.textSub, marginTop: 2, textTransform: 'capitalize' },
  planPrice: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 2 },
  promoTag: { fontSize: 10, color: C.violet, fontWeight: '700', marginTop: 2 },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailCell: {
    width: '48%', backgroundColor: C.bg, borderRadius: 12, padding: 10, gap: 4,
  },
  detailLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 12, fontWeight: '600', color: C.text },

  warnBox: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.amberLight, alignItems: 'flex-start' },
  warnBoxRed: { backgroundColor: C.redLight },
  warnTxt: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },

  actions: { gap: 8 },
  primaryBtn: { borderRadius: 12, overflow: 'hidden' },
  primaryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn: { alignItems: 'center', paddingVertical: 10 },
  outlineDanger: { color: C.red, fontWeight: '600', fontSize: 13 },

  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface,
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border,
  },
  linkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  linkSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  tipCard: {
    flexDirection: 'row', gap: 10, padding: 12, backgroundColor: C.indigoLight,
    borderRadius: 12, alignItems: 'flex-start',
  },
  tipTxt: { flex: 1, fontSize: 11, color: C.textSub, lineHeight: 16 },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28, maxHeight: '88%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  sheetSub: { fontSize: 12, color: C.textMuted, marginTop: 4, marginBottom: 14 },
  cycleToggle: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 12, padding: 4, marginBottom: 14 },
  cycleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  cycleBtnOn: { backgroundColor: C.indigo },
  cycleTxt: { fontSize: 13, fontWeight: '600', color: C.textSub },
  cycleTxtOn: { color: '#fff' },
  planCard: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  planCardPopular: { borderColor: C.indigo, borderWidth: 2 },
  planCardCurrent: { backgroundColor: C.bg },
  popularTag: { fontSize: 10, fontWeight: '800', color: C.indigo },
  planCardName: { fontSize: 16, fontWeight: '800', color: C.text },
  planCardPrice: { fontSize: 20, fontWeight: '800', color: C.text },
  planCardPeriod: { fontSize: 12, fontWeight: '500', color: C.textMuted },
  planCardMeta: { fontSize: 11, color: C.textMuted },
  planSelectBtn: { marginTop: 6, backgroundColor: C.indigo, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  planSelectTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
