import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { expenseService } from '../../services/expense.service';
import { branchService } from '../../services/branch.service';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import DatePickerInput from '../../components/DatePickerInput';
import SelectSheet from '../../components/SelectSheet';
import { FormSection, SelectField } from '../../components/FormSection';
import { expensePaymentModeLabel } from '../../utils/expensePaymentMode';
import { colors, spacing } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { ExpenseCategory, Branch, BillingStackParamList, ExpensePaymentMode } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const PAYMENT_MODES: ExpensePaymentMode[] = ['cash', 'bank_transfer', 'upi', 'card', 'cheque'];
const RECUR_FREQ = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddExpenseScreen() {
  const navigation = useNavigation<Nav>();
  const { branchId } = useAuthStore();
  const bottomInset = useBottomInset();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    category_id: '',
    title: '',
    amount: '',
    date: todayIso(),
    branch_id: branchId ?? '',
    payment_mode: 'cash' as ExpensePaymentMode,
    vendor: '',
    notes: '',
    is_recurring: false,
    recurring_frequency: 'monthly',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [catSheet, setCatSheet] = useState(false);
  const [branchSheet, setBranchSheet] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const [freqSheet, setFreqSheet] = useState(false);

  useFocusEffect(useCallback(() => {
    expenseService.getCategories().then(setCategories).catch(() => {});
    branchService.list().then(setBranches).catch(() => {});
  }, []));

  const set = (field: string, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.category_id) e.category_id = 'Select a category';
    if (!form.title.trim()) e.title = 'Required';
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt < 0.01) e.amount = 'Enter a valid amount';
    if (!form.date) e.date = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await expenseService.create({
        category_id: form.category_id,
        title: form.title.trim(),
        amount: Number(form.amount),
        date: form.date,
        branch_id: form.branch_id || branchId || undefined,
        payment_mode: form.payment_mode,
        vendor: form.vendor.trim() || undefined,
        notes: form.notes.trim() || undefined,
        is_recurring: form.is_recurring,
        recurring_frequency: form.is_recurring ? form.recurring_frequency : undefined,
      });
      Alert.alert('Saved', 'Expense recorded.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const catLabel = categories.find((c) => c.id === form.category_id)?.name ?? '';
  const branchLabel = branches.find((b) => b.id === form.branch_id)?.name ?? (form.branch_id ? 'Branch' : '');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Add expense" subtitle="Record clinic spending" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <SelectField
            label="Category *"
            value={catLabel}
            placeholder="Select category"
            error={errors.category_id}
            onPress={() => setCatSheet(true)}
          />
          <Input label="Title *" value={form.title} onChangeText={(v) => set('title', v)} error={errors.title} placeholder="e.g. Office rent" />
          <Input label="Amount *" value={form.amount} onChangeText={(v) => set('amount', v)} error={errors.amount} keyboardType="decimal-pad" placeholder="0.00" />
          <DatePickerInput label="Date *" value={form.date} onChange={(v) => set('date', v)} error={errors.date} />
          <SelectField
            label="Payment mode"
            value={expensePaymentModeLabel(form.payment_mode)}
            onPress={() => setPaySheet(true)}
          />
          {branches.length > 1 ? (
            <SelectField
              label="Branch"
              value={branchLabel}
              placeholder="Select branch"
              onPress={() => setBranchSheet(true)}
            />
          ) : null}
          <Input label="Vendor" value={form.vendor} onChangeText={(v) => set('vendor', v)} placeholder="Supplier or payee" />
          <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} multiline placeholder="Optional notes" />

          <FormSection title="Recurring">
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Recurring expense</Text>
              <Switch
                value={form.is_recurring}
                onValueChange={(v) => set('is_recurring', v)}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={form.is_recurring ? colors.primary : '#f4f4f5'}
              />
            </View>
            {form.is_recurring ? (
              <SelectField
                label="Frequency"
                value={RECUR_FREQ.find((f) => f.value === form.recurring_frequency)?.label ?? ''}
                onPress={() => setFreqSheet(true)}
              />
            ) : null}
          </FormSection>

          <Button title="Save expense" onPress={handleSave} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={catSheet}
        title="Category"
        options={categories.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name }))}
        selectedValue={form.category_id}
        onSelect={(v) => set('category_id', v)}
        onClose={() => setCatSheet(false)}
      />
      <SelectSheet
        visible={branchSheet}
        title="Branch"
        options={branches.map((b) => ({ value: b.id, label: b.name }))}
        selectedValue={form.branch_id}
        onSelect={(v) => set('branch_id', v)}
        onClose={() => setBranchSheet(false)}
      />
      <SelectSheet
        visible={paySheet}
        title="Payment mode"
        options={PAYMENT_MODES.map((m) => ({ value: m, label: expensePaymentModeLabel(m) }))}
        selectedValue={form.payment_mode}
        onSelect={(v) => set('payment_mode', v)}
        onClose={() => setPaySheet(false)}
      />
      <SelectSheet
        visible={freqSheet}
        title="Frequency"
        options={RECUR_FREQ}
        selectedValue={form.recurring_frequency}
        onSelect={(v) => set('recurring_frequency', v)}
        onClose={() => setFreqSheet(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
});
