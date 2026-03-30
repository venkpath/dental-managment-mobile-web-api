import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import PatientSearchInput from '../../components/PatientSearchInput';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'QuickInvoice'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const ITEM_TYPES = ['treatment', 'service', 'pharmacy'] as const;
type ItemType = typeof ITEM_TYPES[number];

interface LineItem {
  item_type: ItemType;
  description: string;
  quantity: string;
  unit_price: string;
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
  const [loading, setLoading] = useState(false);
  const bottomInset = useBottomInset();

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const setItemType = (index: number, type: ItemType) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, item_type: type } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    return sum + qty * price;
  }, 0);

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
      const discountAmt = parseFloat(discount) || 0;
      const invoice = await invoiceService.create({
        patient_id: selectedPatient.id,
        branch_id: branchId,
        ...(discountAmt > 0 && { discount_amount: discountAmt }),
        items: items.map((it) => ({
          item_type: it.item_type,
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
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
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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
                      {t === 'treatment' ? '🦷' : t === 'service' ? '🔧' : '💊'}
                      {' '}{t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Description *"
                value={item.description}
                onChangeText={(v) => updateItem(index, 'description', v)}
                placeholder="e.g. Root Canal Treatment"
                containerStyle={styles.noMargin}
              />

              <View style={styles.row2}>
                <Input
                  label="Qty"
                  value={item.quantity}
                  onChangeText={(v) => updateItem(index, 'quantity', v)}
                  keyboardType="decimal-pad"
                  containerStyle={styles.qtyInput}
                />
                <Input
                  label="Unit Price (₹) *"
                  value={item.unit_price}
                  onChangeText={(v) => updateItem(index, 'unit_price', v)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  containerStyle={styles.priceInput}
                />
              </View>

              {item.description && item.unit_price && (
                <Text style={styles.itemTotal}>
                  Subtotal: ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString('en-IN')}
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

          <Input
            label="Discount (₹)"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          {/* Total summary */}
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
            {parseFloat(discount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: colors.success }]}>
                  -₹{parseFloat(discount).toLocaleString('en-IN')}
                </Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandRow]}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>
                ₹{(totalAmount - (parseFloat(discount) || 0)).toLocaleString('en-IN')}
              </Text>
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
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeText: { fontSize: typography.xs, color: colors.textSecondary },
  typeTextActive: { color: colors.primary, fontWeight: '600' },
  noMargin: { marginBottom: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  qtyInput: { width: 72 },
  priceInput: { flex: 1 },
  itemTotal: { fontSize: typography.sm, color: colors.primary, fontWeight: '600', textAlign: 'right' },
  addItemBtn: { marginBottom: spacing.base },
  totalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  totalLabel: { fontSize: typography.base, color: colors.textSecondary },
  totalValue: { fontSize: typography.base, fontWeight: '500', color: colors.text },
  grandRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs, paddingTop: spacing.sm },
  grandLabel: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  grandValue: { fontSize: typography.lg, fontWeight: '700', color: colors.primary },
  submitBtn: {},
});
