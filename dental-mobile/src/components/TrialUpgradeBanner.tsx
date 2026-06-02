import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscriptionStore } from '../store/subscription.store';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Global nudge when trial is ending or subscription is inactive (matches web TrialBanner rules).
 */
export default function TrialUpgradeBanner() {
  const navigation = useNavigation<Nav>();
  const banner = useSubscriptionStore((s) => s.banner);
  const shouldShow = useSubscriptionStore((s) => s.shouldShowBanner());

  if (!shouldShow || !banner) return null;

  const isExpired =
    banner.subscription_status === 'expired' ||
    banner.subscription_status === 'cancelled' ||
    (banner.subscription_status === 'trial' && !banner.is_trial_active);

  const onTrial = banner.subscription_status === 'trial' && banner.is_trial_active;
  const urgentTrial = onTrial && banner.trial_days_left <= 3;

  const message = isExpired
    ? 'Your subscription has expired. Subscribe to keep using Smart Dental Desk.'
    : onTrial
      ? urgentTrial
        ? `Free trial ends in ${banner.trial_days_left} day${banner.trial_days_left !== 1 ? 's' : ''}. Upgrade now to avoid interruption.`
        : `You're on a free trial — ${banner.trial_days_left} days left. View plans and upgrade when ready.`
      : 'Subscribe to unlock your full Smart Dental Desk plan.';

  const openBilling = () => {
    navigation.navigate('App', {
      screen: 'Billing',
      params: { screen: 'ClinicBilling' },
    } as never);
  };

  const softTrial = onTrial && !urgentTrial && !isExpired;
  const fg = softTrial ? '#3730a3' : '#fff';
  const iconName = softTrial ? 'sparkles' : 'warning';

  return (
    <View style={[s.wrap, isExpired ? s.wrapExpired : urgentTrial ? s.wrapWarning : s.wrapTrial]}>
      <Ionicons name={iconName} size={16} color={fg} style={s.icon} />
      <Text style={[s.text, { color: fg }]} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity style={s.btn} onPress={openBilling} activeOpacity={0.85}>
        <Text style={s.btnTxt}>Upgrade</Text>
        <Ionicons name="arrow-forward" size={14} color={isExpired ? '#dc2626' : urgentTrial ? '#b45309' : '#4338ca'} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  wrapTrial: { backgroundColor: '#EEF2FF', borderBottomWidth: 1, borderBottomColor: '#C7D2FE' },
  wrapWarning: { backgroundColor: '#f59e0b' },
  wrapExpired: { backgroundColor: '#dc2626' },
  icon: { flexShrink: 0 },
  text: { flex: 1, fontSize: 12, fontWeight: '600', color: '#fff', lineHeight: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  btnTxt: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
});
