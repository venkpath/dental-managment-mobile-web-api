import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Alert, TouchableOpacity, TextInput, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import { formatCurrency, getLocale, getCurrencySymbol } from '../../utils/format';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import DatePickerInput from '../../components/DatePickerInput';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Invoice, BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'InvoiceDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const PAYMENT_METHODS: { key: 'cash' | 'card' | 'upi'; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'upi', label: 'UPI', icon: '📲' },
  { key: 'card', label: 'Card', icon: '💳' },
];

const ITEM_ICONS: Record<string, string> = {
  treatment: '🦷', service: '🔧', pharmacy: '💊',
};

export default function InvoiceDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [method, setMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>();
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [numInstallments, setNumInstallments] = useState('3');
  const [planNotes, setPlanNotes] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  interface PlanRow { amount: string; due_date: string }
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const bottomInset = useBottomInset();

  const load = useCallback(() => {
    invoiceService.get(invoiceId).then((inv) => {
      setInvoice(inv);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  }, [invoiceId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const url = await invoiceService.getPdfUrl(invoiceId);
      await Linking.openURL(url);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const openPayForm = (installmentId?: string, installmentAmount?: number) => {
    setSelectedInstallmentId(installmentId);
    setPayAmount(installmentAmount ? String(installmentAmount) : balanceDue > 0 ? String(Math.round(balanceDue * 100) / 100) : '');
    setPayNotes('');
    setShowPayForm(true);
  };

  const handlePayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { Alert.alert('Invalid Amount', 'Enter a valid amount'); return; }
    if (amt > balanceDue + 0.01) { Alert.alert('Overpayment', `Max payable: ${formatCurrency(balanceDue)}`); return; }
    setPaying(true);
    try {
      await invoiceService.recordPayment(invoiceId, {
        amount: amt, method,
        notes: payNotes.trim() || undefined,
        installment_item_id: selectedInstallmentId,
      });
      load();
      setShowPayForm(false);
      setPayAmount('');
      setPayNotes('');
      setSelectedInstallmentId(undefined);
      Alert.alert('Payment Recorded', `${formatCurrency(amt)} via ${method.toUpperCase()}`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Invoice" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Invoice" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {loadError ? 'Failed to load invoice. Please go back and try again.' : 'Invoice not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const generatePlanRows = (n: number, balance: number) => {
    const base = Math.floor((balance / n) * 100) / 100;
    const remainder = Math.round((balance - base * n) * 100) / 100;
    const today = new Date();
    return Array.from({ length: n }, (_, i) => {
      const due = new Date(today);
      due.setDate(due.getDate() + (i + 1) * 30);
      const amount = i === n - 1 ? String(Math.round((base + remainder) * 100) / 100) : String(base);
      return { amount, due_date: due.toISOString().split('T')[0] };
    });
  };

  const handleNumInstallmentsChange = (val: string) => {
    setNumInstallments(val);
    const n = parseInt(val, 10);
    if (n >= 2 && n <= 24 && invoice) {
      const balance = Number(invoice.net_amount) - (invoice.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0);
      setPlanRows(generatePlanRows(n, balance));
    } else {
      setPlanRows([]);
    }
  };

  const updatePlanRow = (i: number, field: 'amount' | 'due_date', value: string) => {
    setPlanRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleCreatePlan = async () => {
    const n = planRows.length;
    if (n < 2) { Alert.alert('Invalid', 'Enter a number between 2 and 24'); return; }
    for (const r of planRows) {
      if (!r.due_date) { Alert.alert('Invalid', 'Set a due date for every installment'); return; }
      if (!parseFloat(r.amount) || parseFloat(r.amount) <= 0) {
        Alert.alert('Invalid', 'Each installment must have a positive amount');
        return;
      }
    }
    const total = planRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const balance = Number(invoice!.net_amount) - (invoice!.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0);
    if (Math.abs(total - balance) > 0.02) {
      Alert.alert('Amount Mismatch', `Installment total ${formatCurrency(total)} must equal balance ${formatCurrency(balance)}`);
      return;
    }
    setCreatingPlan(true);
    try {
      await invoiceService.createInstallmentPlan(invoiceId, {
        notes: planNotes.trim() || undefined,
        items: planRows.map((r, i) => ({
          installment_number: i + 1,
          amount: parseFloat(r.amount),
          due_date: r.due_date,
        })),
      });
      load();
      setShowPlanForm(false);
      setNumInstallments('3');
      setPlanRows([]);
      setPlanNotes('');
      Alert.alert('Plan Created', `Split into ${n} installments`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    try {
      await invoiceService.sendWhatsApp(invoiceId);
      Alert.alert('Sent', 'Invoice sent to patient via WhatsApp');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send WhatsApp');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const paidAmount = invoice.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const balanceDue = Number(invoice.net_amount) - paidAmount;
  const isPaid = invoice.status === 'paid' || balanceDue <= 0.01;
  const isPartial = invoice.status === 'partially_paid' && paidAmount > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={invoice.invoice_number} onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
              <Text style={styles.invoiceDate}>
                {new Date(invoice.created_at).toLocaleDateString(getLocale(), {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
            <Badge label={invoice.status} variant={invoice.status} />
          </View>

          {/* Payment progress */}
          <View style={styles.amountGrid}>
            <View style={styles.amountCell}>
              <Text style={styles.amountCellLabel}>Net Amount</Text>
              <Text style={styles.amountCellValue}>{formatCurrency(Number(invoice.net_amount))}</Text>
            </View>
            <View style={styles.amountDivider} />
            <View style={styles.amountCell}>
              <Text style={styles.amountCellLabel}>Paid</Text>
              <Text style={[styles.amountCellValue, { color: colors.success }]}>
                {formatCurrency(paidAmount)}
              </Text>
            </View>
            <View style={styles.amountDivider} />
            <View style={styles.amountCell}>
              <Text style={styles.amountCellLabel}>{isPaid ? 'Status' : 'Balance Due'}</Text>
              {isPaid
                ? <Text style={[styles.amountCellValue, { color: colors.success }]}>Paid ✅</Text>
                : <Text style={[styles.amountCellValue, { color: colors.warning }]}>{formatCurrency(balanceDue)}</Text>
              }
            </View>
          </View>

          {/* Progress bar */}
          {!isPaid && paidAmount > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min((paidAmount / Number(invoice.net_amount)) * 100, 100)}%` as any }]} />
              </View>
              <Text style={styles.progressLabel}>
                {Math.round((paidAmount / Number(invoice.net_amount)) * 100)}% paid
              </Text>
            </View>
          )}

          {/* Breakdown */}
          {(Number(invoice.discount_amount) > 0 || Number(invoice.tax_amount) > 0) && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(Number(invoice.total_amount))}</Text>
              {Number(invoice.discount_amount) > 0 && <>
                <Text style={styles.breakdownLabel}>Discount</Text>
                <Text style={[styles.breakdownValue, { color: colors.success }]}>-{formatCurrency(Number(invoice.discount_amount))}</Text>
              </>}
              {Number(invoice.tax_amount) > 0 && <>
                <Text style={styles.breakdownLabel}>Tax (GST)</Text>
                <Text style={styles.breakdownValue}>+{formatCurrency(Number(invoice.tax_amount))}</Text>
              </>}
            </View>
          )}
        </View>

        {/* ── Patient ── */}
        <Card>
          <Text style={styles.cardTitle}>Patient</Text>
          <Text style={styles.patientName}>{invoice.patient.first_name} {invoice.patient.last_name}</Text>
          <Text style={styles.patientPhone}>📞 {invoice.patient.phone}</Text>
        </Card>

        {/* ── Line Items ── */}
        {invoice.items && invoice.items.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Line Items</Text>
            {invoice.items.map((item, idx) => (
              <View key={item.id} style={[styles.lineItem, idx < invoice.items!.length - 1 && styles.lineItemBorder]}>
                <View style={styles.lineItemLeft}>
                  <Text style={styles.lineItemIcon}>{ITEM_ICONS[item.item_type] ?? '🔧'}</Text>
                  <View style={styles.lineItemInfo}>
                    <Text style={styles.lineItemDesc}>{item.description}</Text>
                    <Text style={styles.lineItemQty}>Qty: {item.quantity} × {formatCurrency(Number(item.unit_price))}</Text>
                  </View>
                </View>
                <Text style={styles.lineItemTotal}>{formatCurrency(Number(item.total_price))}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ── Installment Plan ── */}
        {invoice.installment_plan && (
          <Card>
            <Text style={styles.cardTitle}>
              Installment Plan · {invoice.installment_plan.num_installments} installments
            </Text>
            {invoice.installment_plan.items.map((inst) => (
              <View key={inst.id} style={styles.installmentRow}>
                <View style={styles.installmentLeft}>
                  <View style={[
                    styles.installmentDot,
                    inst.status === 'paid' && styles.dotPaid,
                    inst.status === 'overdue' && styles.dotOverdue,
                  ]} />
                  <View>
                    <Text style={styles.installmentNum}>Installment {inst.installment_number}</Text>
                    <Text style={styles.installmentDue}>
                      Due: {new Date(inst.due_date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                      {inst.status === 'overdue' && ' ⚠️'}
                    </Text>
                    {inst.paid_at && (
                      <Text style={styles.installmentPaidAt}>
                        Paid: {new Date(inst.paid_at).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.installmentRight}>
                  <Text style={styles.installmentAmount}>{formatCurrency(Number(inst.amount))}</Text>
                  {inst.status !== 'paid' && !isPaid && (
                    <TouchableOpacity
                      style={styles.payInstBtn}
                      onPress={() => openPayForm(inst.id, inst.amount)}
                    >
                      <Text style={styles.payInstBtnText}>Pay</Text>
                    </TouchableOpacity>
                  )}
                  {inst.status === 'paid' && (
                    <Text style={styles.paidTag}>✓ Paid</Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* ── Payment History ── */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Payment History</Text>
            {invoice.payments.map((p, idx) => (
              <View key={p.id} style={[styles.paymentRow, idx < invoice.payments!.length - 1 && styles.paymentRowBorder]}>
                <View style={styles.paymentLeft}>
                  <View style={styles.paymentMethodBadge}>
                    <Text style={styles.paymentMethodText}>{p.method.toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.paymentDate}>
                      {new Date(p.paid_at).toLocaleDateString(getLocale(), {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                    {p.notes && <Text style={styles.paymentNotes}>{p.notes}</Text>}
                  </View>
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(Number(p.amount))}</Text>
              </View>
            ))}

            {/* Total summary row */}
            {invoice.payments.length > 1 && (
              <View style={styles.paymentTotalRow}>
                <Text style={styles.paymentTotalLabel}>Total Paid</Text>
                <Text style={styles.paymentTotalValue}>{formatCurrency(paidAmount)}</Text>
              </View>
            )}
          </Card>
        )}

        {/* ── Create Installment Plan ── */}
        {!isPaid && !invoice.installment_plan && !showPlanForm && (
          <TouchableOpacity style={styles.createPlanBtn} onPress={() => setShowPlanForm(true)}>
            <Text style={styles.createPlanText}>📅 Create Installment Plan</Text>
          </TouchableOpacity>
        )}

        {!isPaid && !invoice.installment_plan && showPlanForm && (
          <Card>
            <Text style={styles.cardTitle}>Create Installment Plan</Text>
            <Text style={styles.planHint}>
              Balance {formatCurrency(balanceDue)} — set amount and due date for each installment.
            </Text>

            <Text style={styles.fieldLabel}>Number of Installments (2–24)</Text>
            <View style={styles.amountInputWrap}>
              <TextInput
                style={styles.amountInput}
                value={numInstallments}
                onChangeText={handleNumInstallmentsChange}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="3"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Per-installment rows */}
            {planRows.map((row, i) => (
              <View key={i} style={styles.planRow}>
                <View style={styles.planRowHeader}>
                  <Text style={styles.planRowNum}>Installment {i + 1}</Text>
                  <Text style={styles.planRowTotal}>
                    Total so far: {formatCurrency(planRows.slice(0, i + 1).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0))}
                  </Text>
                </View>
                <View style={styles.planRowFields}>
                  <View style={styles.planAmountWrap}>
                    <Text style={styles.rupee}>{getCurrencySymbol()}</Text>
                    <TextInput
                      style={styles.planAmountInput}
                      value={row.amount}
                      onChangeText={(v) => updatePlanRow(i, 'amount', v)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.planDateWrap}>
                    <DatePickerInput
                      value={row.due_date}
                      onChange={(d) => updatePlanRow(i, 'due_date', d)}
                      minDate={new Date()}
                      maxDate={new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5)}
                    />
                  </View>
                </View>
              </View>
            ))}

            {planRows.length > 0 && (
              <View style={styles.planTotalCheck}>
                <Text style={styles.planTotalLabel}>Plan total:</Text>
                <Text style={[
                  styles.planTotalValue,
                  Math.abs(planRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) - balanceDue) < 0.02
                    ? { color: colors.success }
                    : { color: colors.danger }
                ]}>
                  {formatCurrency(planRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0))}
                  {' '}/ {formatCurrency(balanceDue)}
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={planNotes}
              onChangeText={setPlanNotes}
              placeholder="e.g. RCT treatment plan"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.formBtns}>
              <Button title="Cancel" onPress={() => { setShowPlanForm(false); setPlanRows([]); }} variant="outline" style={styles.flex} />
              <Button title="Create Plan" onPress={handleCreatePlan} loading={creatingPlan} style={styles.flex} />
            </View>
          </Card>
        )}

        {/* ── Record Payment ── */}
        {!isPaid && !showPayForm && (
          <Button
            title="💳 Record Payment"
            onPress={() => openPayForm()}
            size="lg"
          />
        )}

        {!isPaid && showPayForm && (
          <Card>
            <Text style={styles.cardTitle}>
              {selectedInstallmentId ? 'Pay Installment' : 'Record Payment'}
            </Text>

            <Text style={styles.balanceHint}>
              Balance due: {formatCurrency(balanceDue)}
            </Text>

            {/* Method */}
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodBtn, method === m.key && styles.methodBtnActive]}
                  onPress={() => setMethod(m.key)}
                >
                  <Text style={styles.methodIcon}>{m.icon}</Text>
                  <Text style={[styles.methodText, method === m.key && styles.methodTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount ({getCurrencySymbol()})</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.rupee}>{getCurrencySymbol()}</Text>
              <TextInput
                style={styles.amountInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={payNotes}
              onChangeText={setPayNotes}
              placeholder="e.g. Visit 2 payment"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.formBtns}>
              <Button
                title="Cancel"
                onPress={() => { setShowPayForm(false); setSelectedInstallmentId(undefined); }}
                variant="outline"
                style={styles.flex}
              />
              <Button
                title="Confirm"
                onPress={handlePayment}
                loading={paying}
                style={styles.flex}
              />
            </View>
          </Card>
        )}

        {isPaid && (
          <View style={styles.paidBanner}>
            <Text style={styles.paidText}>✅ Invoice fully paid</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.pdfBtn, downloadingPdf && styles.pdfBtnDisabled, styles.actionFlex]}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.pdfBtnText}>📄 PDF</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.whatsappBtn, sendingWhatsApp && styles.pdfBtnDisabled, styles.actionFlex]}
            onPress={handleSendWhatsApp}
            disabled={sendingWhatsApp}
          >
            {sendingWhatsApp
              ? <ActivityIndicator size="small" color="#25D366" />
              : <Text style={styles.whatsappBtnText}>📤 Send WhatsApp</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textSecondary },

  // Summary card
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
  },
  summaryTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.md,
  },
  invoiceNum: { fontSize: typography.base, fontWeight: '700', color: colors.primary },
  invoiceDate: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },

  amountGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  amountCell: { flex: 1, alignItems: 'center' },
  amountDivider: { width: 1, height: 36, backgroundColor: colors.borderLight },
  amountCellLabel: { fontSize: typography.xs, color: colors.textMuted, marginBottom: 4 },
  amountCellValue: { fontSize: typography.base, fontWeight: '700', color: colors.text },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressBg: { flex: 1, height: 6, backgroundColor: colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  progressLabel: { fontSize: typography.xs, color: colors.textMuted, minWidth: 50, textAlign: 'right' },

  breakdownRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight,
    justifyContent: 'space-between',
  },
  breakdownLabel: { fontSize: typography.xs, color: colors.textMuted, width: '45%' },
  breakdownValue: { fontSize: typography.xs, fontWeight: '600', color: colors.text, width: '45%', textAlign: 'right' },

  // Card shared
  cardTitle: {
    fontSize: typography.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.md,
  },
  patientName: { fontSize: typography.lg, fontWeight: '600', color: colors.text },
  patientPhone: { fontSize: typography.base, color: colors.textSecondary, marginTop: spacing.xs },

  // Line items
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  lineItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  lineItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  lineItemIcon: { fontSize: 20 },
  lineItemInfo: { flex: 1 },
  lineItemDesc: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  lineItemQty: { fontSize: typography.xs, color: colors.textMuted, marginTop: 2 },
  lineItemTotal: { fontSize: typography.sm, fontWeight: '700', color: colors.text },

  // Installments
  installmentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  installmentLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1 },
  installmentDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.warning, marginTop: 4,
  },
  dotPaid: { backgroundColor: colors.success },
  dotOverdue: { backgroundColor: colors.danger },
  installmentNum: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  installmentDue: { fontSize: typography.xs, color: colors.textSecondary },
  installmentPaidAt: { fontSize: typography.xs, color: colors.success, marginTop: 1 },
  installmentRight: { alignItems: 'flex-end', gap: spacing.xs },
  installmentAmount: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  payInstBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  payInstBtnText: { fontSize: typography.xs, color: colors.white, fontWeight: '700' },
  paidTag: { fontSize: typography.xs, color: colors.success, fontWeight: '600' },

  // Payment history
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  paymentRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paymentMethodBadge: {
    backgroundColor: colors.primaryLight, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  paymentMethodText: { fontSize: typography.xs, fontWeight: '700', color: colors.primary },
  paymentDate: { fontSize: typography.sm, color: colors.text, fontWeight: '500' },
  paymentNotes: { fontSize: typography.xs, color: colors.textMuted, marginTop: 1 },
  paymentAmount: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  paymentTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: spacing.sm, marginTop: spacing.xs,
    borderTopWidth: 1.5, borderTopColor: colors.border,
  },
  paymentTotalLabel: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  paymentTotalValue: { fontSize: typography.sm, fontWeight: '700', color: colors.success },

  // Pay form
  balanceHint: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.md },
  fieldLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  methodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  methodBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  methodBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  methodIcon: { fontSize: 16, marginBottom: 2 },
  methodText: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '500' },
  methodTextActive: { color: colors.primary, fontWeight: '700' },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    minHeight: 50, gap: spacing.xs,
  },
  rupee: { fontSize: typography.lg, fontWeight: '700', color: colors.primary },
  amountInput: { flex: 1, fontSize: typography.lg, color: colors.text, paddingVertical: spacing.sm },
  notesInput: {
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.base, color: colors.text, minHeight: 44,
    marginBottom: spacing.md,
  },
  formBtns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },

  paidBanner: {
    backgroundColor: '#dcfce7', borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center',
  },
  paidText: { fontSize: typography.base, fontWeight: '600', color: colors.success },

  createPlanBtn: {
    borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed',
    borderRadius: radius.lg, padding: spacing.md, alignItems: 'center',
  },
  createPlanText: { fontSize: typography.base, fontWeight: '600', color: colors.primary },
  planHint: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.md },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  pdfBtnDisabled: { opacity: 0.6 },
  pdfBtnText: { fontSize: typography.base, fontWeight: '700', color: colors.primary },
  planRow: {
    backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  planRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  planRowNum: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  planRowTotal: { fontSize: typography.xs, color: colors.textMuted },
  planRowFields: { gap: spacing.xs },
  planAmountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.sm, minHeight: 44,
  },
  planAmountInput: { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: spacing.xs },
  planDateWrap: { marginBottom: 0 },
  planTotalCheck: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.primaryLight, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.sm,
  },
  planTotalLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  planTotalValue: { fontSize: typography.sm, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionFlex: { flex: 1 },
  whatsappBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e8fdf0',
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1.5, borderColor: '#25D366',
  },
  whatsappBtnText: { fontSize: typography.base, fontWeight: '700', color: '#128C7E' },
});
