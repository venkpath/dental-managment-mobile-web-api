import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  membershipsService,
  type MembershipPlanBenefit,
  type CreatePlanPayload,
} from '../../services/memberships.service';
import SelectSheet from '../../components/SelectSheet';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type AddRoute = RouteProp<BillingStackParamList, 'AddMembershipPlan'>;
type EditRoute = RouteProp<BillingStackParamList, 'EditMembershipPlan'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', red: '#dc2626',
};

const BENEFIT_TYPES = [
  { value: 'included_service', label: 'Included service' },
  { value: 'discount_percentage', label: 'Discount %' },
  { value: 'discount_flat', label: 'Flat discount' },
  { value: 'credit', label: 'Credit' },
];

const emptyBenefit = (): MembershipPlanBenefit => ({
  title: '',
  benefit_type: 'included_service',
  included_quantity: 1,
  is_active: true,
});

export default function MembershipPlanFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<AddRoute | EditRoute>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const params = route.params as EditRoute['params'] | undefined;
  const isEdit = !!params && 'planId' in params && !!params.planId;
  const planId = isEdit ? params!.planId : undefined;

  const [booting, setBooting] = useState(isEdit);
  const [loading, setLoading] = useState(false);
  const [typeSheetIndex, setTypeSheetIndex] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    price: '',
    duration_months: '12',
    covered_members_limit: '1',
    grace_period_days: '0',
    is_active: true,
    terms_and_conditions: '',
  });
  const [benefits, setBenefits] = useState<MembershipPlanBenefit[]>([emptyBenefit()]);

  useFocusEffect(useCallback(() => {
    if (!isEdit || !planId) return;
    setBooting(true);
    membershipsService.getPlan(planId).then((p) => {
      if (!p) return;
      setForm({
        name: p.name,
        code: p.code ?? '',
        description: p.description ?? '',
        category: p.category ?? '',
        price: String(p.price ?? 0),
        duration_months: String(p.duration_months ?? 12),
        covered_members_limit: String(p.max_members ?? 1),
        grace_period_days: String(p.grace_period_days ?? 0),
        is_active: p.is_active !== false,
        terms_and_conditions: p.terms_and_conditions ?? '',
      });
      setBenefits(
        (p.benefits ?? []).length > 0
          ? p.benefits!.map((b) => ({
              ...b,
              included_quantity: b.included_quantity ?? 1,
            }))
          : [emptyBenefit()],
      );
    }).finally(() => setBooting(false));
  }, [isEdit, planId]));

  const setField = (key: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Plan name is required.');
      return false;
    }
    const cleanBenefits = benefits.filter((b) => b.title.trim());
    if (cleanBenefits.length === 0) {
      Alert.alert('Benefits', 'Add at least one benefit with a title.');
      return false;
    }
    return true;
  };

  const buildPayload = (): CreatePlanPayload => ({
    name: form.name.trim(),
    code: form.code.trim() || undefined,
    description: form.description.trim() || undefined,
    category: form.category.trim() || undefined,
    price: form.price ? Number(form.price) : 0,
    duration_months: form.duration_months ? parseInt(form.duration_months, 10) : 12,
    covered_members_limit: form.covered_members_limit ? parseInt(form.covered_members_limit, 10) : 1,
    grace_period_days: form.grace_period_days ? parseInt(form.grace_period_days, 10) : 0,
    is_active: form.is_active,
    terms_and_conditions: form.terms_and_conditions.trim() || undefined,
    benefits: benefits
      .filter((b) => b.title.trim())
      .map((b, i) => ({
        title: b.title.trim(),
        description: b.description?.trim() || undefined,
        benefit_type: b.benefit_type ?? 'included_service',
        included_quantity: b.included_quantity ? Number(b.included_quantity) : undefined,
        discount_percentage: b.discount_percentage ? Number(b.discount_percentage) : undefined,
        discount_amount: b.discount_amount ? Number(b.discount_amount) : undefined,
        credit_amount: b.credit_amount ? Number(b.credit_amount) : undefined,
        display_order: i,
        is_active: b.is_active !== false,
      })),
  });

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = buildPayload();
      if (isEdit && planId) {
        await membershipsService.updatePlan(planId, payload);
        Alert.alert('Saved', 'Membership plan updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        const created = await membershipsService.createPlan(payload);
        Alert.alert('Created', 'Membership plan created.', [
          { text: 'View', onPress: () => navigation.replace('MembershipPlanDetail', { planId: created.id }) },
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <View style={[ui.screen, { paddingTop: insets.top }]}>
        <View style={ui.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top, backgroundColor: C.bg }}>
        <View style={ui.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ui.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={ui.topTitle}>{isEdit ? 'Edit plan' : 'New plan'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + bottomInset, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Plan details</Text>
          <Field label="Name *" value={form.name} onChange={(v) => setField('name', v)} />
          <Field label="Code" value={form.code} onChange={(v) => setField('code', v)} placeholder="Optional" />
          <Field label="Description" value={form.description} onChange={(v) => setField('description', v)} multiline />
          <Field label="Category" value={form.category} onChange={(v) => setField('category', v)} placeholder="e.g. preventive" />
          <View style={ui.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Price" value={form.price} onChange={(v) => setField('price', v)} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Duration (months)" value={form.duration_months} onChange={(v) => setField('duration_months', v)} keyboardType="number-pad" />
            </View>
          </View>
          <View style={ui.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Max members" value={form.covered_members_limit} onChange={(v) => setField('covered_members_limit', v)} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Grace days" value={form.grace_period_days} onChange={(v) => setField('grace_period_days', v)} keyboardType="number-pad" />
            </View>
          </View>
          <View style={ui.switchRow}>
            <Text style={ui.fieldLabel}>Active plan</Text>
            <Switch value={form.is_active} onValueChange={(v) => setField('is_active', v)} trackColor={{ true: C.indigo }} />
          </View>
        </View>

        <View style={ui.card}>
          <View style={ui.rowHead}>
            <Text style={ui.sectionLabel}>Benefits *</Text>
            <TouchableOpacity onPress={() => setBenefits((b) => [...b, emptyBenefit()])} activeOpacity={0.7}>
              <Text style={ui.link}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {benefits.map((b, i) => (
            <View key={i} style={[ui.benefitCard, i > 0 && { marginTop: 10 }]}>
              <View style={ui.rowHead}>
                <Text style={ui.benefitNum}>Benefit {i + 1}</Text>
                {benefits.length > 1 && (
                  <TouchableOpacity onPress={() => setBenefits((prev) => prev.filter((_, idx) => idx !== i))}>
                    <Text style={ui.remove}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Field label="Title *" value={b.title} onChange={(v) => {
                setBenefits((prev) => prev.map((x, idx) => idx === i ? { ...x, title: v } : x));
              }} />
              <Text style={ui.fieldLabel}>Type</Text>
              <TouchableOpacity style={ui.field} onPress={() => setTypeSheetIndex(i)} activeOpacity={0.7}>
                <Text style={ui.fieldTxt}>
                  {BENEFIT_TYPES.find((t) => t.value === b.benefit_type)?.label ?? b.benefit_type}
                </Text>
                <Ionicons name="chevron-down" size={16} color={C.textMuted} />
              </TouchableOpacity>
              {b.benefit_type === 'included_service' && (
                <Field
                  label="Quantity"
                  value={String(b.included_quantity ?? 1)}
                  onChange={(v) => setBenefits((prev) => prev.map((x, idx) => idx === i ? { ...x, included_quantity: parseInt(v, 10) || 1 } : x))}
                  keyboardType="number-pad"
                />
              )}
              {b.benefit_type === 'discount_percentage' && (
                <Field
                  label="Discount %"
                  value={b.discount_percentage != null ? String(b.discount_percentage) : ''}
                  onChange={(v) => setBenefits((prev) => prev.map((x, idx) => idx === i ? { ...x, discount_percentage: Number(v) || 0 } : x))}
                  keyboardType="decimal-pad"
                />
              )}
            </View>
          ))}
        </View>

        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Terms (optional)</Text>
          <TextInput
            value={form.terms_and_conditions}
            onChangeText={(v) => setField('terms_and_conditions', v)}
            placeholder="Terms shown on enrollment"
            placeholderTextColor={C.textMuted}
            multiline
            style={[ui.input, { minHeight: 80, textAlignVertical: 'top' }]}
          />
        </View>
      </ScrollView>

      <View style={[ui.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity style={[ui.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryTxt}>{isEdit ? 'Save changes' : 'Create plan'}</Text>}
        </TouchableOpacity>
      </View>

      <SelectSheet
        visible={typeSheetIndex !== null}
        title="Benefit type"
        options={BENEFIT_TYPES}
        selectedValue={typeSheetIndex !== null ? benefits[typeSheetIndex]?.benefit_type ?? '' : ''}
        onSelect={(v) => {
          if (typeSheetIndex !== null) {
            setBenefits((prev) => prev.map((x, idx) => idx === typeSheetIndex ? { ...x, benefit_type: v } : x));
          }
        }}
        onClose={() => setTypeSheetIndex(null)}
      />
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChange, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[ui.input, multiline && { minHeight: 56, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  topTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text, backgroundColor: C.bg,
  },
  field: {
    flexDirection: 'row', alignItems: 'center', minHeight: 48,
    borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: C.bg, marginBottom: 10,
  },
  fieldTxt: { flex: 1, fontSize: 15, color: C.text },
  row2: { flexDirection: 'row', gap: 10 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  link: { fontSize: 13, fontWeight: '700', color: C.indigo },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  benefitCard: { backgroundColor: C.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  benefitNum: { fontSize: 13, fontWeight: '700', color: C.text },
  remove: { fontSize: 13, fontWeight: '600', color: C.red },
  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  primaryBtn: { backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
