import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REGISTRATION_PLANS, getRegistrationPlan, type RegistrationPlan } from '../constants/registrationPlans';

type Props = {
  selected: string;
  onSelect: (key: string) => void;
  billingCycle: 'monthly' | 'yearly';
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
};

export default function PlanPicker({ selected, onSelect, billingCycle, onBillingCycleChange }: Props) {
  const [open, setOpen] = useState(false);
  const plan = getRegistrationPlan(selected);
  const isPaid = plan.price > 0;

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.header} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <View style={[s.iconBox, { backgroundColor: plan.iconBg }]}>
          <Ionicons name={plan.icon} size={18} color={plan.iconColor} />
        </View>
        <View style={s.headerText}>
          <View style={s.nameRow}>
            <Text style={s.planName}>{plan.name}</Text>
            {plan.popular && (
              <View style={s.popularBadge}>
                <Text style={s.popularTxt}>Popular</Text>
              </View>
            )}
          </View>
          <Text style={s.summary} numberOfLines={2}>{plan.summary}</Text>
        </View>
        <View style={s.priceCol}>
          <PlanPrice plan={plan} cycle={billingCycle} compact />
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
      </TouchableOpacity>

      {open && (
        <View style={s.list}>
          {REGISTRATION_PLANS.map((p) => {
            const active = p.key === selected;
            return (
              <TouchableOpacity
                key={p.key}
                style={[s.row, active && s.rowActive]}
                onPress={() => { onSelect(p.key); setOpen(false); }}
                activeOpacity={0.75}
              >
                <View style={[s.iconBoxSm, { backgroundColor: p.iconBg }]}>
                  <Ionicons name={p.icon} size={16} color={p.iconColor} />
                </View>
                <View style={s.rowText}>
                  <Text style={[s.rowName, active && s.rowNameActive]}>{p.name}</Text>
                  <Text style={s.rowSummary} numberOfLines={2}>{p.summary}</Text>
                </View>
                <PlanPrice plan={p} cycle={billingCycle} />
                {active && <Ionicons name="checkmark-circle" size={20} color="#4361EE" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {isPaid && (
        <View style={s.cycleRow}>
          <TouchableOpacity
            style={[s.cycleBtn, billingCycle === 'monthly' && s.cycleBtnOn]}
            onPress={() => onBillingCycleChange('monthly')}
          >
            <Text style={[s.cycleTxt, billingCycle === 'monthly' && s.cycleTxtOn]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.cycleBtn, billingCycle === 'yearly' && s.cycleBtnOn]}
            onPress={() => onBillingCycleChange('yearly')}
          >
            <Text style={[s.cycleTxt, billingCycle === 'yearly' && s.cycleTxtOn]}>Yearly</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.hint}>14-day free trial on paid plans. No credit card required now.</Text>
    </View>
  );
}

function PlanPrice({
  plan,
  cycle,
  compact,
}: {
  plan: RegistrationPlan;
  cycle: 'monthly' | 'yearly';
  compact?: boolean;
}) {
  if (plan.price === 0) {
    return <Text style={[s.priceFree, compact && s.priceFreeSm]}>Free</Text>;
  }
  const amount = cycle === 'yearly' ? plan.priceYearly : plan.price;
  const suffix = cycle === 'yearly' ? '/yr' : plan.period;
  return (
    <Text style={[s.pricePaid, compact && s.pricePaidSm]}>
      ₹{amount.toLocaleString('en-IN')}
      <Text style={s.priceSuffix}>{suffix}</Text>
    </Text>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBoxSm: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  planName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  popularBadge: { backgroundColor: '#10B981', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  popularTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  summary: { fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 15 },
  priceCol: { alignItems: 'flex-end' },
  priceFree: { fontSize: 14, fontWeight: '800', color: '#4361EE' },
  priceFreeSm: { fontSize: 12 },
  pricePaid: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  pricePaidSm: { fontSize: 11 },
  priceSuffix: { fontSize: 10, fontWeight: '500', color: '#94a3b8' },
  list: { borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  rowActive: { backgroundColor: '#EEF2FF' },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  rowNameActive: { color: '#4361EE' },
  rowSummary: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cycleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cycleBtnOn: { borderColor: '#4361EE', backgroundColor: '#EEF2FF' },
  cycleTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  cycleTxtOn: { color: '#4361EE' },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 6,
  },
});
