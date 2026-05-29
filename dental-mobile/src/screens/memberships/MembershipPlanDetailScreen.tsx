import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { membershipsService, type MembershipPlan } from '../../services/memberships.service';
import { formatCurrency } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'MembershipPlanDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6',
};

export default function MembershipPlanDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { planId } = route.params;

  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    membershipsService.getPlan(planId)
      .then(setPlan)
      .finally(() => setLoading(false));
  }, [planId]));

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Header onBack={() => navigation.goBack()} title="Plan" />
        <View style={s.center}><Text style={s.muted}>Plan not found</Text></View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <Header onBack={() => navigation.goBack()} title={plan.name} />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + bottomInset }]} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.heroRow}>
            <View style={s.heroIcon}>
              <Ionicons name="shield-checkmark" size={28} color={C.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>{plan.name}</Text>
              {plan.code ? <Text style={s.heroSub}>Code: {plan.code}</Text> : null}
              <View style={[s.pill, { backgroundColor: plan.is_active === false ? '#f1f5f9' : C.greenLight, alignSelf: 'flex-start', marginTop: 6 }]}>
                <Text style={[s.pillTxt, { color: plan.is_active === false ? C.textMuted : C.green }]}>
                  {plan.is_active === false ? 'Inactive' : 'Active'}
                </Text>
              </View>
            </View>
          </View>
          {plan.description ? <Text style={s.desc}>{plan.description}</Text> : null}
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Pricing & limits</Text>
          <InfoRow label="Price" value={formatCurrency(Number(plan.price))} />
          <InfoRow label="Duration" value={`${plan.duration_months ?? 12} months`} />
          <InfoRow label="Max members" value={String(plan.max_members ?? 1)} />
          {plan.grace_period_days != null && plan.grace_period_days > 0 && (
            <InfoRow label="Grace period" value={`${plan.grace_period_days} days`} />
          )}
          {plan.category ? <InfoRow label="Category" value={plan.category} /> : null}
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Benefits ({plan.benefits?.length ?? 0})</Text>
          {(plan.benefits ?? []).length === 0 ? (
            <Text style={s.muted}>No benefits configured</Text>
          ) : (
            (plan.benefits ?? []).map((b, i) => (
              <View key={b.id ?? i} style={[s.benefitRow, i > 0 && s.benefitBorder]}>
                <Ionicons name="checkmark-circle" size={16} color={C.green} />
                <View style={{ flex: 1 }}>
                  <Text style={s.benefitTitle}>{b.title}</Text>
                  {b.description ? <Text style={s.benefitSub}>{b.description}</Text> : null}
                  <Text style={s.benefitMeta}>
                    {b.benefit_type?.replace(/_/g, ' ')}
                    {b.included_quantity ? ` · Qty ${b.included_quantity}` : ''}
                    {b.discount_percentage ? ` · ${b.discount_percentage}% off` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {plan.terms_and_conditions ? (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Terms</Text>
            <Text style={s.desc}>{plan.terms_and_conditions}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => navigation.navigate('EditMembershipPlan', { planId: plan.id })}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={s.editTxt}>Edit plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={s.topbar}>
      <TouchableOpacity onPress={onBack} style={s.iconBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={C.text} />
      </TouchableOpacity>
      <Text style={s.topTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLbl}>{label}</Text>
      <Text style={s.infoVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: C.textMuted, fontSize: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  heroRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: C.indigoLight,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  heroSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillTxt: { fontSize: 11, fontWeight: '700' },
  desc: { fontSize: 14, color: C.textSub, lineHeight: 20, marginTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLbl: { fontSize: 14, color: C.textSub },
  infoVal: { fontSize: 14, fontWeight: '700', color: C.text },
  benefitRow: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  benefitBorder: { borderTopWidth: 1, borderTopColor: C.divider },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  benefitSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  benefitMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  footer: {
    paddingHorizontal: 16, paddingTop: 10, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14,
  },
  editTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
