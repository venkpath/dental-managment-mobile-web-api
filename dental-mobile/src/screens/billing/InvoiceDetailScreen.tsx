import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
  TouchableOpacity, TextInput, Linking, Modal, Pressable,
  Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { LinearGradient } from 'expo-linear-gradient';
import { invoiceService } from '../../services/invoice.service';
import { formatCurrency, getLocale, getCurrencySymbol } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import { C, invoiceStatusMeta, lifecycleBanner } from './_invoiceTheme';
import type { Invoice, BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'InvoiceDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const PAY_METHODS: { key: 'cash' | 'card' | 'upi'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'cash', label: 'Cash', icon: 'wallet-outline' },
  { key: 'card', label: 'Card', icon: 'card-outline' },
  { key: 'upi',  label: 'UPI',  icon: 'phone-portrait-outline' },
];

const REFUND_METHODS: { key: 'cash' | 'card' | 'upi' | 'bank_transfer'; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi',  label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'bank_transfer', label: 'Bank' },
];

function methodPill(method: string) {
  switch (method) {
    case 'cash':          return { bg: C.greenLight, fg: C.green,  label: 'Cash' };
    case 'card':          return { bg: C.indigoLight, fg: C.indigo, label: 'Card' };
    case 'upi':           return { bg: C.amberLight, fg: C.amber,  label: 'UPI' };
    case 'bank_transfer': return { bg: C.grayLight,  fg: C.gray,   label: 'Bank' };
    default:              return { bg: C.grayLight,  fg: C.gray,   label: method.toUpperCase() };
  }
}

export default function InvoiceDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Header / menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  // Payment form
  const [payOpen, setPayOpen] = useState(false);
  const [payMethodOpen, setPayMethodOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // Refund form
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'upi' | 'bank_transfer'>('cash');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Installment plan
  const [numInstallments, setNumInstallments] = useState('3');
  const [instPickerOpen, setInstPickerOpen] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);

  const load = useCallback(() => {
    invoiceService.get(invoiceId)
      .then((inv) => { setInvoice(inv); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, [invoiceId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Derived amounts ───────────────────────────────────────────────────────
  const paidAmount     = invoice?.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const refundedAmount = invoice?.refunds?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const net            = Number(invoice?.net_amount ?? 0);
  const subtotal       = Number(invoice?.total_amount ?? 0);
  const tax            = Number(invoice?.tax_amount ?? 0);
  const discount       = Number(invoice?.discount_amount ?? 0);
  const balanceDue     = Math.max(0, net - paidAmount + refundedAmount);
  const isPaid         = invoice ? (invoice.status === 'paid' || balanceDue <= 0.01) : false;
  const refundable     = Math.max(0, paidAmount - refundedAmount);

  // ── PDF: download & print ──────────────────────────────────────────────────
  const handleDownload = async () => {
    setMenuOpen(false);
    setDownloading(true);
    try {
      const url = await invoiceService.getPdfUrl(invoiceId);
      const target = FileSystem.documentDirectory + `invoice_${invoice?.invoice_number ?? invoiceId}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Invoice PDF', UTI: 'com.adobe.pdf' });
      } else {
        await Linking.openURL(url);
      }
    } catch (err: unknown) {
      Alert.alert('Download failed', err instanceof Error ? err.message : 'Could not generate the PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    setMenuOpen(false);
    setPrinting(true);
    try {
      const url = await invoiceService.getPdfUrl(invoiceId);
      const target = FileSystem.cacheDirectory + `invoice_print_${invoiceId}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, target);
      await Print.printAsync({ uri });
    } catch (err: unknown) {
      Alert.alert('Print failed', err instanceof Error ? err.message : 'Could not open the print dialog.');
    } finally {
      setPrinting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (invoice?.lifecycle_status === 'draft') {
      Alert.alert('Draft invoice', 'Issue the invoice before sending it to the patient.');
      return;
    }
    if (invoice?.lifecycle_status === 'cancelled') {
      Alert.alert('Cancelled', 'This invoice was cancelled and cannot be sent.');
      return;
    }
    setMenuOpen(false);
    setSendingWhatsApp(true);
    try {
      await invoiceService.sendWhatsApp(invoiceId);
      Alert.alert('Sent', 'Invoice sent to the patient via WhatsApp.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send WhatsApp message.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // ── Record payment ──────────────────────────────────────────────────────────
  const openPay = () => {
    setPayMethod('cash');
    setPayAmount(balanceDue > 0 ? String(Math.round(balanceDue * 100) / 100) : '');
    setPayNotes('');
    setPayOpen(true);
  };

  const closePay = () => {
    Keyboard.dismiss();
    setPayOpen(false);
  };

  const handlePayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount', 'Enter a valid payment amount.'); return; }
    if (amt > balanceDue + 0.01) { Alert.alert('Overpayment', `Maximum payable is ${formatCurrency(balanceDue)}.`); return; }
    Keyboard.dismiss();
    setPaying(true);
    try {
      await invoiceService.recordPayment(invoiceId, {
        amount: amt, method: payMethod, notes: payNotes.trim() || undefined,
      });
      setPayOpen(false);
      load();
      Alert.alert('Payment recorded', `${formatCurrency(amt)} via ${payMethod.toUpperCase()}`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  // ── Refund ────────────────────────────────────────────────────────────────
  const openRefund = () => {
    if (refundable <= 0) { Alert.alert('Nothing to refund', 'No payments are available to refund on this invoice.'); return; }
    setRefundMethod('cash');
    setRefundAmount(String(Math.round(refundable * 100) / 100));
    setRefundReason('');
    setRefundOpen(true);
  };

  const handleRefund = async () => {
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount', 'Enter a valid refund amount.'); return; }
    if (amt > refundable + 0.01) { Alert.alert('Exceeds refundable', `Maximum refundable is ${formatCurrency(refundable)}.`); return; }
    Keyboard.dismiss();
    setRefunding(true);
    try {
      await invoiceService.refund(invoiceId, {
        amount: amt, method: refundMethod, reason: refundReason.trim() || undefined,
      });
      setRefundOpen(false);
      load();
      Alert.alert('Refund recorded', `${formatCurrency(amt)} via ${refundMethod.replace('_', ' ').toUpperCase()}`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Refund failed.');
    } finally {
      setRefunding(false);
    }
  };

  // ── Installment plan ──────────────────────────────────────────────────────
  const handleCreatePlan = async () => {
    const n = parseInt(numInstallments, 10);
    if (!n || n < 2 || n > 24) { Alert.alert('Invalid', 'Choose between 2 and 24 installments.'); return; }
    const base = Math.floor((balanceDue / n) * 100) / 100;
    const remainder = Math.round((balanceDue - base * n) * 100) / 100;
    const today = new Date();
    const items = Array.from({ length: n }, (_, i) => {
      const due = new Date(today);
      due.setDate(due.getDate() + (i + 1) * 30);
      const amount = i === n - 1 ? Math.round((base + remainder) * 100) / 100 : base;
      return { installment_number: i + 1, amount, due_date: due.toISOString().split('T')[0] };
    });
    setCreatingPlan(true);
    try {
      await invoiceService.createInstallmentPlan(invoiceId, { items });
      load();
      Alert.alert('Plan created', `Balance split into ${n} installments.`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create plan.');
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleDeletePlan = () => {
    Alert.alert('Delete plan?', 'Remove this installment plan? This is only possible if no installment has been paid.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await invoiceService.deleteInstallmentPlan(invoiceId); load(); }
          catch (err: unknown) { Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete plan.'); }
        },
      },
    ]);
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Header onBack={() => navigation.goBack()} number="" onPrint={() => {}} onDownload={() => {}} onMenu={() => {}} busy />
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }
  if (!invoice) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Header onBack={() => navigation.goBack()} number="" onPrint={() => {}} onDownload={() => {}} onMenu={() => {}} busy />
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
          <Text style={s.errorText}>{loadError ? 'Failed to load invoice.' : 'Invoice not found.'}</Text>
        </View>
      </View>
    );
  }

  const pill = invoiceStatusMeta(invoice.status);
  const life = lifecycleBanner(invoice.lifecycle_status);
  const insuranceCovered = Number(invoice.insurance_covered_amount ?? 0);
  const patientCopay = Number(invoice.patient_copay_amount ?? 0);
  const hasInsurance = insuranceCovered > 0 || patientCopay > 0 || !!invoice.patient_insurance;

  // Merged, chronological payment + refund history
  const history = [
    ...(invoice.payments ?? []).map((p) => ({ kind: 'payment' as const, id: p.id, at: p.paid_at, amount: Number(p.amount), method: p.method, note: p.notes })),
    ...(invoice.refunds ?? []).map((r) => ({ kind: 'refund' as const, id: r.id, at: r.refunded_at, amount: Number(r.amount), method: 'refund', note: r.reason })),
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <Header
        onBack={() => navigation.goBack()}
        number={invoice.invoice_number}
        onPrint={handlePrint}
        onDownload={handleDownload}
        onMenu={() => setMenuOpen(true)}
        printing={printing}
        downloading={downloading}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 28 + bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {life && (
          <View style={[s.lifeBanner, { backgroundColor: life.bg }]}>
            <Ionicons name={life.icon} size={16} color={life.fg} />
            <Text style={[s.lifeBannerTxt, { color: life.fg }]}>
              {invoice.lifecycle_status === 'draft'
                ? 'Draft — issue from web or API before patient can view or pay'
                : 'Cancelled — no further payments or WhatsApp'}
            </Text>
          </View>
        )}

        {/* ── Invoice card ── */}
        <View style={s.card}>
          {/* Top: icon + title + status */}
          <View style={s.invTop}>
            <View style={s.invIconBox}>
              <Ionicons name="document-text" size={22} color={C.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.invKicker}>INVOICE</Text>
              <Text style={s.invNumber}>{invoice.invoice_number}</Text>
              <Text style={s.invCreated}>
                Created on {new Date(invoice.created_at).toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: pill.bg }]}>
              <Ionicons name={pill.icon} size={12} color={pill.fg} />
              <Text style={[s.statusTxt, { color: pill.fg }]}>{pill.label}</Text>
            </View>
          </View>

          <View style={s.hr} />

          {/* Bill-to / Branch / Doctor + Edit */}
          <View style={s.infoSection}>
            <View style={s.billRow}>
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>BILL TO</Text>
                <View style={s.infoLine}>
                  <Ionicons name="person-outline" size={14} color={C.textSub} />
                  <Text style={s.infoValue}>{invoice.patient.first_name} {invoice.patient.last_name}</Text>
                </View>
                <Text style={s.infoSub}>{invoice.patient.phone}</Text>
              </View>
              <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('EditInvoice', { invoiceId })} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={13} color={C.textSub} />
                <Text style={s.editTxt}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={s.infoGrid}>
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>BRANCH</Text>
                <View style={s.infoLine}>
                  <Ionicons name="business-outline" size={14} color={C.textSub} />
                  <Text style={s.infoValue}>{invoice.branch?.name ?? '—'}</Text>
                </View>
              </View>
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>DOCTOR</Text>
                <View style={s.infoLine}>
                  <Ionicons name="medkit-outline" size={14} color={C.textSub} />
                  <Text style={s.infoValue}>{invoice.dentist?.name ?? '—'}</Text>
                </View>
              </View>
            </View>

            {invoice.treatment_date ? (
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>TREATMENT DATE</Text>
                <View style={s.infoLine}>
                  <Ionicons name="calendar-outline" size={14} color={C.textSub} />
                  <Text style={s.infoValue}>
                    {new Date(invoice.treatment_date).toLocaleDateString(getLocale(), {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            ) : null}

            {invoice.gst_number ? (
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>GST NUMBER</Text>
                <View style={s.infoLine}>
                  <Ionicons name="document-text-outline" size={14} color={C.textSub} />
                  <Text style={s.infoValue}>{invoice.gst_number}</Text>
                </View>
              </View>
            ) : null}

            {invoice.patient_insurance ? (
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>INSURANCE</Text>
                <Text style={s.infoValue}>
                  {invoice.patient_insurance.provider?.name ?? 'Enrollment'}
                  {invoice.patient_insurance.plan?.plan_name
                    ? ` · ${invoice.patient_insurance.plan.plan_name}`
                    : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Line items */}
          <View style={s.itemsHead}>
            <Text style={s.itemsHeadTxt}>ITEMS</Text>
            <Text style={s.itemsHeadTxt}>AMOUNT</Text>
          </View>
          {(invoice.items ?? []).map((item, idx) => (
            <View key={item.id} style={[s.itemRow, idx < (invoice.items!.length - 1) && s.itemRowBorder]}>
              <View style={s.itemLeft}>
                <Text style={s.itemDesc}>{idx + 1}. {item.description}</Text>
                <View style={s.itemMeta}>
                  <View style={s.typePill}>
                    <Text style={s.typeTxt}>{item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}</Text>
                  </View>
                  <Text style={s.itemMetaTxt}>{item.quantity} × {formatCurrency(Number(item.unit_price))}</Text>
                </View>
              </View>
              <Text style={s.itemTotal}>{formatCurrency(Number(item.total_price))}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {discount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Discount</Text>
                <Text style={[s.totalValue, { color: C.green }]}>-{formatCurrency(discount)}</Text>
              </View>
            )}
            {tax > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Tax (GST)</Text>
                <Text style={s.totalValue}>+{formatCurrency(tax)}</Text>
              </View>
            )}
            {hasInsurance && (
              <>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Insurance covered</Text>
                  <Text style={[s.totalValue, { color: C.teal }]}>{formatCurrency(insuranceCovered)}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Patient co-pay</Text>
                  <Text style={s.totalValue}>{formatCurrency(patientCopay)}</Text>
                </View>
              </>
            )}
            <View style={s.totalDivider} />
            <View style={s.totalRow}>
              <Text style={s.netLabel}>Net Amount</Text>
              <Text style={s.netValue}>{formatCurrency(net)}</Text>
            </View>
            {paidAmount > 0 && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: C.green }]}>Paid</Text>
                <Text style={[s.totalValue, { color: C.green }]}>-{formatCurrency(paidAmount)}</Text>
              </View>
            )}
            {refundedAmount > 0 && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: C.red }]}>Refunded</Text>
                <Text style={[s.totalValue, { color: C.red }]}>+{formatCurrency(refundedAmount)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { fontWeight: '700', color: C.text }]}>Balance Due</Text>
              <Text style={[s.balanceValue, { color: isPaid ? C.green : C.amber }]}>{formatCurrency(balanceDue)}</Text>
            </View>
          </View>
        </View>

        {/* ── Action buttons ── */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionCard, (invoice.lifecycle_status === 'draft' || invoice.lifecycle_status === 'cancelled') && s.actionDisabled]}
            onPress={handleSendWhatsApp}
            disabled={sendingWhatsApp || invoice.lifecycle_status === 'draft' || invoice.lifecycle_status === 'cancelled'}
            activeOpacity={0.7}
          >
            <View style={s.actionIconWrap}>
              {sendingWhatsApp
                ? <ActivityIndicator size="small" color={C.green} />
                : <Ionicons name="logo-whatsapp" size={20} color={C.green} />}
            </View>
            <Text style={[s.actionTxt, { color: C.green }]}>Send{'\n'}WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={openRefund} activeOpacity={0.7}>
            <View style={s.actionIconWrap}>
              <Ionicons name="arrow-undo-outline" size={20} color={C.amber} />
            </View>
            <Text style={[s.actionTxt, { color: C.amber }]}>Refund</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard, isPaid && s.actionDisabled]}
            onPress={openPay}
            disabled={isPaid}
            activeOpacity={0.7}
          >
            <View style={s.actionIconWrap}>
              <Ionicons name="card-outline" size={20} color={isPaid ? C.textMuted : C.purple} />
            </View>
            <Text style={[s.actionTxt, { color: isPaid ? C.textMuted : C.purple }]}>Record{'\n'}Payment</Text>
          </TouchableOpacity>
        </View>

        {/* ── Installment Plan ── */}
        <View style={s.card}>
          <View style={s.sectionHead}>
            <Ionicons name="calendar-outline" size={18} color={C.indigo} />
            <Text style={s.sectionTitle}>Installment Plan</Text>
          </View>

          {invoice.installment_plan ? (
            <>
              <Text style={s.sectionSub}>
                {invoice.installment_plan.num_installments} installments · {formatCurrency(Number(invoice.installment_plan.total_amount))}
              </Text>
              {invoice.installment_plan.items.map((inst) => {
                const instPill = inst.status === 'paid' ? { bg: C.greenLight, fg: C.green } : inst.status === 'overdue' ? { bg: C.redLight, fg: C.red } : { bg: C.amberLight, fg: C.amber };
                return (
                  <View key={inst.id} style={s.instRow}>
                    <View style={[s.instDot, { backgroundColor: instPill.fg }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.instNum}>Installment {inst.installment_number}</Text>
                      <Text style={s.instDue}>
                        Due {new Date(inst.due_date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={s.instAmt}>{formatCurrency(Number(inst.amount))}</Text>
                    <View style={[s.instBadge, { backgroundColor: instPill.bg }]}>
                      <Text style={[s.instBadgeTxt, { color: instPill.fg }]}>{inst.status}</Text>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity style={s.deletePlanBtn} onPress={handleDeletePlan} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={14} color={C.red} />
                <Text style={s.deletePlanTxt}>Delete plan</Text>
              </TouchableOpacity>
            </>
          ) : isPaid ? (
            <Text style={s.sectionSub}>This invoice is fully settled — no installment plan needed.</Text>
          ) : (
            <>
              <Text style={s.sectionSub}>Split the balance of {formatCurrency(balanceDue)} into installments for easy tracking</Text>
              <View style={s.planControls}>
                <Text style={s.planFieldLabel}>Installments</Text>
                <TouchableOpacity style={s.instSelect} onPress={() => setInstPickerOpen(true)} activeOpacity={0.7}>
                  <Text style={s.instSelectTxt}>{numInstallments}</Text>
                  <Ionicons name="chevron-down" size={14} color={C.textSub} />
                </TouchableOpacity>
                <TouchableOpacity style={s.createPlanBtn} onPress={handleCreatePlan} disabled={creatingPlan} activeOpacity={0.8}>
                  {creatingPlan
                    ? <ActivityIndicator size="small" color={C.indigo} />
                    : <><Ionicons name="add" size={16} color={C.indigo} /><Text style={s.createPlanTxt}>Create Plan</Text></>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ── Payment History ── */}
        <View style={s.card}>
          <View style={s.sectionHead}>
            <Ionicons name="card-outline" size={18} color={C.indigo} />
            <Text style={s.sectionTitle}>Payment History</Text>
          </View>

          {history.length === 0 ? (
            <Text style={s.sectionSub}>No payments recorded yet.</Text>
          ) : (
            history.map((h, idx) => {
              const mp = h.kind === 'refund' ? { bg: C.redLight, fg: C.red, label: 'Refund' } : methodPill(h.method);
              return (
                <View key={h.id} style={[s.phItem, idx < history.length - 1 && s.phItemBorder]}>
                  <View style={s.phItemTop}>
                    <View style={s.phItemLeft}>
                      <View style={[s.methodBadge, { backgroundColor: mp.bg }]}>
                        <Text style={[s.methodBadgeTxt, { color: mp.fg }]}>{mp.label}</Text>
                      </View>
                      <Text style={s.phDate}>
                        {new Date(h.at).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{new Date(h.at).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[s.phAmt, h.kind === 'refund' && { color: C.red }]}>
                      {h.kind === 'refund' ? '-' : ''}{formatCurrency(h.amount)}
                    </Text>
                  </View>
                  {h.note ? (
                    <View style={s.phNoteRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textMuted} />
                      <Text style={s.phNote}>{h.note}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Kebab menu ── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[s.menu, { top: insets.top + 56 }]}>
            <MenuItem icon="download-outline" label="Download PDF" onPress={handleDownload} />
            <MenuItem icon="print-outline" label="Print" onPress={handlePrint} />
            <MenuItem icon="logo-whatsapp" label="Send via WhatsApp" onPress={handleSendWhatsApp} color={C.green} />
          </View>
        </Pressable>
      </Modal>

      {/* ── Installment count picker ── */}
      <Modal visible={instPickerOpen} transparent animationType="fade" onRequestClose={() => setInstPickerOpen(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setInstPickerOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Number of installments</Text>
              <Text style={s.sheetSub}>Between 2 and 24</Text>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                <TouchableOpacity key={n} style={s.sheetItem} onPress={() => { setNumInstallments(String(n)); setInstPickerOpen(false); }} activeOpacity={0.7}>
                  <Text style={s.sheetItemTxt}>{n} installments</Text>
                  {String(n) === numInstallments && <Ionicons name="checkmark" size={18} color={C.indigo} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Record Payment sheet ── */}
      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={closePay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>
          <Pressable style={s.sheetBackdrop} onPress={closePay}>
            <Pressable style={s.paySheet} onPress={() => Keyboard.dismiss()}>
              <View style={s.dragHandle} />

              <View style={s.payHead}>
                <Text style={s.payTitle}>Record Payment</Text>
                <TouchableOpacity style={s.payClose} onPress={closePay} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color={C.text} />
                </TouchableOpacity>
              </View>

            {/* Balance due card */}
            <View style={s.balanceCard}>
              <View style={s.balanceIcon}>
                <Ionicons name="document-text-outline" size={18} color={C.indigo} />
              </View>
              <View>
                <Text style={s.balanceLabel}>Balance due</Text>
                <Text style={s.balanceAmt}>{formatCurrency(balanceDue)}</Text>
              </View>
            </View>

            {/* Amount */}
            <Text style={s.payLabel}>Amount ({getCurrencySymbol()})</Text>
            <View style={s.payAmountWrap}>
              <View style={s.payAmountBadge}>
                <Text style={s.payAmountBadgeTxt}>{getCurrencySymbol()}</Text>
              </View>
              <TextInput
                style={s.payAmountInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={C.textMuted}
              />
            </View>

            {/* Payment method dropdown */}
            <Text style={s.payLabel}>Payment Method</Text>
            <TouchableOpacity style={s.methodSelect} onPress={() => setPayMethodOpen(true)} activeOpacity={0.7}>
              <View style={s.methodSelectLeft}>
                <Ionicons name={(PAY_METHODS.find((m) => m.key === payMethod) ?? PAY_METHODS[0]).icon} size={18} color={C.indigo} />
                <Text style={s.methodSelectTxt}>{(PAY_METHODS.find((m) => m.key === payMethod) ?? PAY_METHODS[0]).label}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={C.textSub} />
            </TouchableOpacity>

            {/* Notes */}
            <Text style={s.payLabel}>Notes (optional)</Text>
            <View style={s.notesWrap}>
              <Ionicons name="document-text-outline" size={16} color={C.indigo} style={{ marginTop: 2 }} />
              <TextInput
                style={s.notesArea}
                value={payNotes}
                onChangeText={setPayNotes}
                placeholder="e.g. Visit 2 payment"
                placeholderTextColor={C.textMuted}
                multiline
              />
            </View>

            {/* Buttons */}
            <TouchableOpacity onPress={handlePayment} disabled={paying} activeOpacity={0.9} style={s.payPrimaryWrap}>
              <LinearGradient colors={['#7B61FF', '#4361EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.payPrimary}>
                {paying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.payPrimaryTxt}>Record Payment</Text>}
              </LinearGradient>
            </TouchableOpacity>
              <TouchableOpacity style={s.payCancel} onPress={closePay} activeOpacity={0.7}>
                <Text style={s.payCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Payment method picker ── */}
      <Modal visible={payMethodOpen} transparent animationType="fade" onRequestClose={() => setPayMethodOpen(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setPayMethodOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Payment Method</Text>
              <Text style={s.sheetSub}>How was the payment made?</Text>
            </View>
            {PAY_METHODS.map((m) => (
              <TouchableOpacity key={m.key} style={s.methodOpt} onPress={() => { setPayMethod(m.key); setPayMethodOpen(false); }} activeOpacity={0.7}>
                <View style={s.methodOptLeft}>
                  <View style={s.methodOptIcon}><Ionicons name={m.icon} size={18} color={C.indigo} /></View>
                  <Text style={s.methodOptTxt}>{m.label}</Text>
                </View>
                {payMethod === m.key && <Ionicons name="checkmark" size={20} color={C.indigo} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Refund sheet ── */}
      <FormSheet
        visible={refundOpen}
        title="Refund"
        subtitle={`Refundable: ${formatCurrency(refundable)}`}
        onClose={() => setRefundOpen(false)}
      >
        <Text style={s.fieldLabel}>Refund Method</Text>
        <View style={s.methodRow}>
          {REFUND_METHODS.map((m) => (
            <TouchableOpacity key={m.key} style={[s.methodBtn, refundMethod === m.key && s.methodBtnActive]} onPress={() => setRefundMethod(m.key)} activeOpacity={0.7}>
              <Text style={[s.methodBtnTxt, refundMethod === m.key && { color: C.indigo, fontWeight: '700' }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.fieldLabel}>Amount ({getCurrencySymbol()})</Text>
        <View style={s.amountWrap}>
          <Text style={s.amountSymbol}>{getCurrencySymbol()}</Text>
          <TextInput style={s.amountInput} value={refundAmount} onChangeText={setRefundAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textMuted} />
        </View>
        <Text style={s.fieldLabel}>Reason (optional)</Text>
        <TextInput style={s.notesInput} value={refundReason} onChangeText={setRefundReason} placeholder="e.g. Cancelled second sitting" placeholderTextColor={C.textMuted} />
        <View style={s.sheetBtns}>
          <TouchableOpacity style={[s.sheetBtn, s.sheetBtnGhost]} onPress={() => { Keyboard.dismiss(); setRefundOpen(false); }} activeOpacity={0.7}>
            <Text style={s.sheetBtnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.sheetBtn, { backgroundColor: C.amber }]} onPress={handleRefund} disabled={refunding} activeOpacity={0.85}>
            {refunding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sheetBtnPrimaryTxt}>Confirm Refund</Text>}
          </TouchableOpacity>
        </View>
      </FormSheet>
    </View>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────
function Header({
  onBack, number, onPrint, onDownload, onMenu, busy, printing, downloading,
}: {
  onBack: () => void; number: string;
  onPrint: () => void; onDownload: () => void; onMenu: () => void;
  busy?: boolean; printing?: boolean; downloading?: boolean;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.hBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={C.text} />
      </TouchableOpacity>
      <View style={s.hTitleBlock}>
        <Text style={s.hTitle}>Invoice Detail</Text>
        {!busy && (
          <View style={s.breadcrumb}>
            <Text style={s.crumbMuted}>Invoices</Text>
            <Ionicons name="chevron-forward" size={11} color={C.textMuted} />
            <Text style={s.crumbActive} numberOfLines={1}>{number}</Text>
          </View>
        )}
      </View>
      <View style={s.hActions}>
        <TouchableOpacity style={s.hBtn} onPress={onPrint} activeOpacity={0.7}>
          {printing ? <ActivityIndicator size="small" color={C.textSub} /> : <Ionicons name="print-outline" size={18} color={C.text} />}
        </TouchableOpacity>
        <TouchableOpacity style={s.hBtn} onPress={onDownload} activeOpacity={0.7}>
          {downloading ? <ActivityIndicator size="small" color={C.textSub} /> : <Ionicons name="download-outline" size={18} color={C.text} />}
        </TouchableOpacity>
        <TouchableOpacity style={s.hBtn} onPress={onMenu} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={18} color={C.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MenuItem({ icon, label, onPress, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={color ?? C.textSub} />
      <Text style={[s.menuItemTxt, color ? { color } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FormSheet({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  const close = () => { Keyboard.dismiss(); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>
        <Pressable style={s.sheetBackdrop} onPress={close}>
          <Pressable style={s.sheet} onPress={() => Keyboard.dismiss()}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{title}</Text>
              <Text style={s.sheetSub}>{subtitle}</Text>
            </View>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  lifeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  lifeBannerTxt: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText: { color: C.textSub, fontSize: 14 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10, backgroundColor: C.bg },
  hBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  hTitleBlock: { flex: 1 },
  hTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  crumbMuted: { fontSize: 12, color: C.textMuted },
  crumbActive: { fontSize: 12, color: C.indigo, fontWeight: '600', flexShrink: 1 },
  hActions: { flexDirection: 'row', gap: 8 },

  // Card
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },

  // Invoice top
  invTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  invIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  invKicker: { fontSize: 12, fontWeight: '800', color: C.indigo, letterSpacing: 1 },
  invNumber: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 1 },
  invCreated: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusTxt: { fontSize: 12, fontWeight: '700' },

  hr: { height: 1, backgroundColor: C.divider, marginVertical: 14 },

  // Info section
  infoSection: { marginBottom: 16 },
  billRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoGrid: { flexDirection: 'row', gap: 12, marginTop: 14 },
  infoBlock: { flex: 1, gap: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  editTxt: { fontSize: 12, fontWeight: '600', color: C.textSub },
  infoLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoValue: { fontSize: 14, fontWeight: '700', color: C.text, flexShrink: 1 },
  infoSub: { fontSize: 12, color: C.textSub, marginLeft: 19 },

  // Line items (stacked, mobile-friendly)
  itemsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.grayLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  itemsHeadTxt: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  itemLeft: { flex: 1, gap: 6 },
  itemDesc: { fontSize: 14, fontWeight: '700', color: C.text },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemMetaTxt: { fontSize: 12, color: C.textMuted },
  itemTotal: { fontSize: 14, fontWeight: '800', color: C.text },
  tdStrong: { fontWeight: '700', color: C.text },
  typePill: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeTxt: { fontSize: 10, fontWeight: '600', color: C.textSub },

  // Totals
  totals: { marginTop: 14, alignSelf: 'flex-end', width: '78%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  totalLabel: { fontSize: 13, color: C.textSub },
  totalValue: { fontSize: 13, fontWeight: '600', color: C.text },
  totalDivider: { height: 1, backgroundColor: C.divider, marginVertical: 6 },
  netLabel: { fontSize: 14, fontWeight: '800', color: C.text },
  netValue: { fontSize: 14, fontWeight: '800', color: C.text },
  balanceValue: { fontSize: 15, fontWeight: '800' },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 8, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 14, paddingHorizontal: 6, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  actionIconWrap: { height: 24, alignItems: 'center', justifyContent: 'center' },
  actionDisabled: { opacity: 0.5 },
  actionTxt: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 16 },

  // Section
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  sectionSub: { fontSize: 12, color: C.textSub, marginBottom: 12 },

  // Plan controls
  planControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planFieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSub },
  instSelect: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, minWidth: 64, justifyContent: 'space-between' },
  instSelectTxt: { fontSize: 14, fontWeight: '700', color: C.text },
  createPlanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: C.indigoLight, borderRadius: 10, paddingVertical: 11 },
  createPlanTxt: { fontSize: 13, fontWeight: '700', color: C.indigo },

  // Plan items
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.divider },
  instDot: { width: 8, height: 8, borderRadius: 4 },
  instNum: { fontSize: 13, fontWeight: '700', color: C.text },
  instDue: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  instAmt: { fontSize: 13, fontWeight: '700', color: C.text },
  instBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, minWidth: 56, alignItems: 'center' },
  instBadgeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  deletePlanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  deletePlanTxt: { fontSize: 12, fontWeight: '700', color: C.red },

  // Payment history (stacked, notes on their own line)
  phItem: { paddingVertical: 12 },
  phItemBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  phItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  phItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  phDate: { fontSize: 12, color: C.textSub, fontWeight: '500', flexShrink: 1 },
  phAmt: { fontSize: 14, fontWeight: '800', color: C.text },
  phNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  phNote: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 17 },
  methodBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  methodBadgeTxt: { fontSize: 11, fontWeight: '700' },

  // Kebab menu
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.2)' },
  menu: { position: 'absolute', right: 16, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 6, borderWidth: 1, borderColor: C.border, minWidth: 210, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  menuItemTxt: { fontSize: 14, fontWeight: '600', color: C.text },

  // Sheets
  kav: { flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  sheetHeader: { paddingHorizontal: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider, marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  sheetSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
  sheetItemTxt: { fontSize: 14, fontWeight: '600', color: C.text },

  // Form fields
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6, marginTop: 10 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border },
  methodBtnActive: { borderColor: C.indigo, backgroundColor: C.indigoLight },
  methodBtnTxt: { fontSize: 12, fontWeight: '600', color: C.textSub },
  amountWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, minHeight: 50 },
  amountSymbol: { fontSize: 18, fontWeight: '700', color: C.indigo },
  amountInput: { flex: 1, fontSize: 18, color: C.text, paddingVertical: 8 },
  notesInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, minHeight: 46 },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
  sheetBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  sheetBtnGhost: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  sheetBtnGhostTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
  sheetBtnPrimary: { backgroundColor: C.indigo },
  sheetBtnPrimaryTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Record Payment sheet
  paySheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  payHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  payTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  payClose: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  balanceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.indigoLight, borderRadius: 14, padding: 14, marginBottom: 18 },
  balanceIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 12, color: C.textSub },
  balanceAmt: { fontSize: 20, fontWeight: '800', color: C.indigo, marginTop: 1 },

  payLabel: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 8 },
  payAmountWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 18 },
  payAmountBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  payAmountBadgeTxt: { fontSize: 15, fontWeight: '800', color: C.indigo },
  payAmountInput: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text, paddingVertical: 4 },

  methodSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18 },
  methodSelectLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodSelectTxt: { fontSize: 15, fontWeight: '600', color: C.text },

  notesWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 22, minHeight: 84 },
  notesArea: { flex: 1, fontSize: 14, color: C.text, padding: 0, textAlignVertical: 'top' },

  payPrimaryWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 12, shadowColor: C.indigo, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  payPrimary: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  payPrimaryTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  payCancel: { alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  payCancelTxt: { fontSize: 15, fontWeight: '700', color: C.text },

  // Method picker options
  methodOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
  methodOptLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodOptIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  methodOptTxt: { fontSize: 15, fontWeight: '600', color: C.text },
});
