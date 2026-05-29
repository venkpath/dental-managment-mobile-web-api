import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Switch, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
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
import { canDeleteExpenses } from '../../utils/permissions';
import type { ExpenseCategory, Branch, BillingStackParamList, ExpensePaymentMode } from '../../types';

type Route = RouteProp<BillingStackParamList, 'EditExpense'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const PAYMENT_MODES: ExpensePaymentMode[] = ['cash', 'bank_transfer', 'upi', 'card', 'cheque'];
const RECUR_FREQ = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function EditExpenseScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { expenseId } = route.params;
  const { branchId, user } = useAuthStore();
  const showDelete = canDeleteExpenses(user?.role);
  const bottomInset = useBottomInset();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    category_id: '',
    title: '',
    amount: '',
    date: '',
    branch_id: '',
    payment_mode: '' as ExpensePaymentMode | '',
    vendor: '',
    notes: '',
    is_recurring: false,
    recurring_frequency: 'monthly',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [catSheet, setCatSheet] = useState(false);
  const [branchSheet, setBranchSheet] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const [freqSheet, setFreqSheet] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([
      expenseService.getCategories(),
      branchService.list(),
      expenseService.get(expenseId),
    ])
      .then(([cats, brs, exp]) => {
        setCategories(cats);
        setBranches(brs);
        const d = exp.date?.slice(0, 10) ?? '';
        setForm({
          category_id: exp.category_id ?? exp.category?.id ?? '',
          title: exp.title ?? '',
          amount: String(exp.amount ?? ''),
          date: d,
          branch_id: exp.branch_id ?? branchId ?? '',
          payment_mode: (exp.payment_mode as ExpensePaymentMode) ?? 'cash',
          vendor: exp.vendor ?? '',
          notes: exp.notes ?? '',
          is_recurring: !!exp.is_recurring,
          recurring_frequency: exp.recurring_frequency ?? 'monthly',
        });
      })
      .catch(() => Alert.alert('Error', 'Could not load expense'))
      .finally(() => setBooting(false));
  }, [expenseId, branchId]));

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
      await expenseService.update(expenseId, {
        category_id: form.category_id,
        title: form.title.trim(),
        amount: Number(form.amount),
        date: form.date,
        branch_id: form.branch_id || undefined,
        payment_mode: form.payment_mode || undefined,
        vendor: form.vendor.trim() || undefined,
        notes: form.notes.trim() || undefined,
        is_recurring: form.is_recurring,
        recurring_frequency: form.is_recurring ? form.recurring_frequency : undefined,
      });
      Alert.alert('Saved', 'Expense updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete expense', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseService.delete(expenseId);
            navigation.goBack();
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete');
          }
        },
      },
    ]);
  };

  const catLabel = categories.find((c) => c.id === form.category_id)?.name ?? '';
  const branchLabel = branches.find((b) => b.id === form.branch_id)?.name ?? '';

  if (booting) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScreenHeader title="Edit expense" onBack={() => navigation.goBack()} />
        <View style={s.center}><Text style={s.muted}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Edit expense" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <SelectField label="Category *" value={catLabel} placeholder="Select category" error={errors.category_id} onPress={() => setCatSheet(true)} />
          <Input label="Title *" value={form.title} onChangeText={(v) => set('title', v)} error={errors.title} />
          <Input label="Amount *" value={form.amount} onChangeText={(v) => set('amount', v)} error={errors.amount} keyboardType="decimal-pad" />
          <DatePickerInput label="Date *" value={form.date} onChange={(v) => set('date', v)} error={errors.date} />
          <SelectField
            label="Payment mode"
            value={form.payment_mode ? expensePaymentModeLabel(form.payment_mode) : ''}
            onPress={() => setPaySheet(true)}
          />
          {branches.length > 1 ? (
            <SelectField label="Branch" value={branchLabel} onPress={() => setBranchSheet(true)} />
          ) : null}
          <Input label="Vendor" value={form.vendor} onChangeText={(v) => set('vendor', v)} />
          <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} multiline />

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

          <Button title="Save changes" onPress={handleSave} loading={loading} />
          {showDelete ? (
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Text style={s.deleteTxt}>Delete expense</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet visible={catSheet} title="Category" options={categories.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name }))} selectedValue={form.category_id} onSelect={(v) => set('category_id', v)} onClose={() => setCatSheet(false)} />
      <SelectSheet visible={branchSheet} title="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} selectedValue={form.branch_id} onSelect={(v) => set('branch_id', v)} onClose={() => setBranchSheet(false)} />
      <SelectSheet visible={paySheet} title="Payment mode" options={PAYMENT_MODES.map((m) => ({ value: m, label: expensePaymentModeLabel(m) }))} selectedValue={form.payment_mode} onSelect={(v) => set('payment_mode', v)} onClose={() => setPaySheet(false)} />
      <SelectSheet visible={freqSheet} title="Frequency" options={RECUR_FREQ} selectedValue={form.recurring_frequency} onSelect={(v) => set('recurring_frequency', v)} onClose={() => setFreqSheet(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  deleteBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  deleteTxt: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
