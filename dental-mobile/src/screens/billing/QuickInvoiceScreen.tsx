import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import { treatmentService } from '../../services/treatment.service';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import PatientSearchInput from '../../components/PatientSearchInput';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList, Treatment } from '../../types';

type Route = RouteProp<BillingStackParamList, 'QuickInvoice'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const ITEM_TYPES = ['treatment', 'service', 'pharmacy'] as const;
type ItemType = typeof ITEM_TYPES[number];

const TYPE_ICONS: Record<ItemType, string> = {
  treatment: '🦷',
  service: '🔧',
  pharmacy: '💊',
};

interface LineItem {
  item_type: ItemType;
  description: string;
  quantity: string;
  unit_price: string;
  treatment_id?: string;
}

const emptyItem = (): LineItem => ({
  item_type: 'service',
  description: '',
  quantity: '1',
  unit_price: '',
});

export default function QuickInvoiceScreen() {
  const navigation = useNavigation<Nav>();
  const { branchId } = useAuthStore();
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [patientError, setPatientError] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState('0');
  const [loading, setLoading] = useState(false);
  const bottomInset = useBottomInset();

  // Treatment picker modal
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [treatmentModalIndex, setTreatmentModalIndex] = useState<number | null>(null);

  const fetchTreatments = useCallback(async (patientId: string) => {
    setLoadingTreatments(true);
    try {
      const list = await treatmentService.listByPatient(patientId);
      setTreatments(list);
    } catch {
      setTreatments([]);
    } finally {
      setLoadingTreatments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatient?.id) {
      fetchTreatments(selectedPatient.id);
    } else {
      setTreatments([]);
    }
  }, [selectedPatient, fetchTreatments]);

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const setItemType = (index: number, type: ItemType) => {
    setItems((prev) => prev.map((it, i) =>
      i === index ? { ...it, item_type: type, description: '', unit_price: '', treatment_id: undefined } : it
    ));
  };

  const openTreatmentPicker = (index: number) => {
    if (!selectedPatient) {
      Alert.alert('Select Patient First', 'Please select a patient to pick a treatment');
      return;
    }
    setTreatmentModalIndex(index);
  };

  const selectTreatment = (index: number, treatment: Treatment) => {
    setItems((prev) => prev.map((it, i) =>
      i === index ? {
        ...it,
        description: treatment.procedure,
        unit_price: String(Number(treatment.cost)),
        treatment_id: treatment.id,
      } : it
    ));
    setTreatmentModalIndex(null);
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    return sum + qty * price;
  }, 0);
  const discountAmt = parseFloat(discount) || 0;
  const taxRate = parseFloat(gst) || 0;
  const taxableBase = subtotal - discountAmt;
  const taxAmount = Math.round(taxableBase * (taxRate / 100) * 100) / 100;
  const grandTotal = taxableBase + taxAmount;

  const handleSubmit = async () => {
    if (!selectedPatient?.id) {
      setPatientError('Please select a patient');
      return;
    }
    setPatientError('');
    if (!branchId) {
      Alert.alert('Error', 'No branch assigned');
      return;
    }
    for (const it of items) {
      if (!it.description.trim() || !it.unit_price) {
        Alert.alert('Error', 'Fill in description and price for all items');
        return;
      }
    }

    setLoading(true);
    try {
      const invoice = await invoiceService.create({
        patient_id: selectedPatient.id,
        branch_id: branchId,
        ...(discountAmt > 0 && { discount_amount: discountAmt }),
        ...(taxRate > 0 && { tax_percentage: taxRate }),
        items: items.map((it) => ({
          item_type: it.item_type,
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          ...(it.treatment_id && { treatment_id: it.treatment_id }),
        })),
      });
      Alert.alert('Invoice Created', `Invoice ${invoice.invoice_number} created successfully`, [
        {
          text: 'View Invoice',
          onPress: () => navigation.replace('InvoiceDetail', { invoiceId: invoice.id }),
        },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create invoice';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="New Invoice" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PatientSearchInput
            selectedPatient={selectedPatient}
            onSelect={(p) => { setSelectedPatient(p); setPatientError(''); }}
            error={patientError}
          />

          <Text style={styles.sectionTitle}>Line Items</Text>

          {items.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNum}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <Text style={styles.removeBtn}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Type selector */}
              <View style={styles.typeRow}>
                {ITEM_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, item.item_type === t && styles.typeBtnActive]}
                    onPress={() => setItemType(index, t)}
                  >
                    <Text style={[styles.typeText, item.item_type === t && styles.typeTextActive]}>
                      {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Treatment picker button */}
              {item.item_type === 'treatment' && (
                <TouchableOpacity
                  style={[styles.treatmentPickerBtn, item.treatment_id && styles.treatmentPickerSelected]}
                  onPress={() => openTreatmentPicker(index)}
                >
                  <Text style={styles.treatmentPickerIcon}>🦷</Text>
                  <Text style={[styles.treatmentPickerText, item.treatment_id && styles.treatmentPickerTextSelected]}>
                    {item.treatment_id
                      ? item.description || 'Treatment selected'
                      : 'Select from patient treatments'}
                  </Text>
                  <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>
              )}

              {/* Description - free text for non-treatment, or editable override for treatment */}
              {item.item_type !== 'treatment' && (
                <Input
                  label="Description *"
                  value={item.description}
                  onChangeText={(v) => updateItem(index, 'description', v)}
                  placeholder={item.item_type === 'service' ? 'e.g. Consultation Fee' : 'e.g. Paracetamol 500mg'}
                  containerStyle={styles.noMargin}
                />
              )}

              {item.item_type === 'treatment' && item.treatment_id && (
                <Input
                  label="Description *"
                  value={item.description}
                  onChangeText={(v) => updateItem(index, 'description', v)}
                  placeholder="Treatment description"
                  containerStyle={styles.noMargin}
                />
              )}

              <View style={styles.row2}>
                <Input
                  label="Qty"
                  value={item.quantity}
                  onChangeText={(v) => updateItem(index, 'quantity', v)}
                  keyboardType="decimal-pad"
                  containerStyle={styles.qtyInput}
                />
                <Input
                 label={`Unit Price (${getCurrencySymbol()}) *`}
                  value={item.unit_price}
                  onChangeText={(v) => updateItem(index, 'unit_price', v)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  containerStyle={styles.priceInput}
                />
              </View>

              {item.description && item.unit_price && (
                <Text style={styles.itemTotal}>
                  Subtotal: {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                </Text>
              )}
            </View>
          ))}

          <Button
            title="+ Add Item"
            onPress={addItem}
            variant="outline"
            size="sm"
            style={styles.addItemBtn}
          />

          <View style={styles.row2}>
            <Input
              label={`Discount (${getCurrencySymbol()})`}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="decimal-pad"
              placeholder="0"
              containerStyle={styles.flex}
            />
            <Input
              label="GST / Tax (%)"
              value={gst}
              onChangeText={setGst}
              keyboardType="decimal-pad"
              placeholder="0"
              containerStyle={styles.flex}
            />
          </View>

          {/* Total summary */}
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {discountAmt > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: colors.success }]}>
                  -{formatCurrency(discountAmt)}
                </Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST ({taxRate}%)</Text>
                <Text style={styles.totalValue}>+{formatCurrency(taxAmount)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandRow]}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>

          <Button
            title="Create Invoice"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Treatment Picker Modal ── */}
      <Modal
        visible={treatmentModalIndex !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setTreatmentModalIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Treatment</Text>
              <TouchableOpacity onPress={() => setTreatmentModalIndex(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingTreatments ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.modalLoadingText}>Loading treatments…</Text>
              </View>
            ) : treatments.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No treatments found for this patient</Text>
                <TouchableOpacity onPress={() => setTreatmentModalIndex(null)} style={styles.modalEmptyBtn}>
                  <Text style={styles.modalEmptyBtnText}>Enter description manually</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={treatments}
                keyExtractor={(t) => t.id}
                contentContainerStyle={styles.modalList}
                renderItem={({ item: t }) => (
                  <TouchableOpacity
                    style={styles.treatmentOption}
                    onPress={() => treatmentModalIndex !== null && selectTreatment(treatmentModalIndex, t)}
                  >
                    <View style={styles.treatmentOptionLeft}>
                      <Text style={styles.treatmentProcedure}>{t.procedure}</Text>
                      {t.tooth_number && (
                        <Text style={styles.treatmentMeta}>Tooth {t.tooth_number} · {t.status}</Text>
                      )}
                      {!t.tooth_number && (
                        <Text style={styles.treatmentMeta}>{t.status}</Text>
                      )}
                    </View>
                    <Text style={styles.treatmentCost}>{formatCurrency(Number(t.cost))}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },

  sectionTitle: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  lineItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  itemNum: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  removeBtn: { fontSize: typography.sm, color: colors.danger },

  typeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  typeBtn: {
    flex: 1, paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center',
  },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeText: { fontSize: typography.xs, color: colors.textSecondary },
  typeTextActive: { color: colors.primary, fontWeight: '600' },

  treatmentPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    minHeight: 50, marginBottom: spacing.sm,
  },
  treatmentPickerSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  treatmentPickerIcon: { fontSize: 18 },
  treatmentPickerText: { flex: 1, fontSize: typography.base, color: colors.textMuted },
  treatmentPickerTextSelected: { color: colors.primary, fontWeight: '600' },
  chevron: { fontSize: 11, color: colors.textMuted },

  noMargin: { marginBottom: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  qtyInput: { width: 72 },
  priceInput: { flex: 1 },
  itemTotal: { fontSize: typography.sm, color: colors.primary, fontWeight: '600', textAlign: 'right' },
  addItemBtn: { marginBottom: spacing.base },

  totalBox: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.base, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.base,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  totalLabel: { fontSize: typography.base, color: colors.textSecondary },
  totalValue: { fontSize: typography.base, fontWeight: '500', color: colors.text },
  grandRow: {
    borderTopWidth: 1, borderTopColor: colors.border,
    marginTop: spacing.xs, paddingTop: spacing.sm,
  },
  grandLabel: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  grandValue: { fontSize: typography.lg, fontWeight: '700', color: colors.primary },
  submitBtn: {},

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  modalClose: { fontSize: typography.lg, color: colors.textMuted, padding: spacing.xs },
  modalLoading: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  modalLoadingText: { color: colors.textSecondary },
  modalEmpty: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  modalEmptyText: { color: colors.textSecondary, textAlign: 'center' },
  modalEmptyBtn: {
    backgroundColor: colors.primaryLight, borderRadius: radius.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
  },
  modalEmptyBtnText: { color: colors.primary, fontWeight: '600' },
  modalList: { padding: spacing.sm },
  treatmentOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base,
  },
  treatmentOptionLeft: { flex: 1, marginRight: spacing.sm },
  treatmentProcedure: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  treatmentMeta: { fontSize: typography.xs, color: colors.textMuted, marginTop: 2 },
  treatmentCost: { fontSize: typography.base, fontWeight: '700', color: colors.primary },
  separator: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.sm },
});
