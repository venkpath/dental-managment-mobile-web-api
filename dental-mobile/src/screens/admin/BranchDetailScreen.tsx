import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { branchService } from '../../services/branch.service';
import { formatTimeRange, formatWorkingDays } from '../../utils/workingDays';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useAuthStore } from '../../store/auth.store';
import { canManageBranches } from '../../utils/permissions';
import type { Branch, BranchScheduling, BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'BranchDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  teal: '#0891b2', tealLight: '#ecfeff',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

function DetailRow({ label, value, icon, onPress }: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  if (!value || value === '—') return null;
  const inner = (
    <View style={s.row}>
      {icon ? (
        <View style={s.rowIcon}>
          <Ionicons name={icon} size={16} color={C.teal} />
        </View>
      ) : null}
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={[s.rowValue, onPress && s.rowLink]}>{value}</Text>
      </View>
      {onPress ? <Ionicons name="open-outline" size={16} color={C.textMuted} /> : null}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>;
  }
  return inner;
}

function fullAddress(b: Branch): string {
  const parts = [b.address, b.city, b.state, b.pincode, b.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export default function BranchDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { branchId } = route.params;
  const { user } = useAuthStore();
  const showEdit = canManageBranches(user?.role);

  const [branch, setBranch] = useState<Branch | null>(null);
  const [scheduling, setScheduling] = useState<BranchScheduling | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      branchService.get(branchId),
      branchService.getScheduling(branchId).catch(() => null),
    ])
      .then(([b, sch]) => {
        setBranch(b);
        setScheduling(sch);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [branchId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const openMaps = () => {
    const url = branch?.map_url;
    if (url) Linking.openURL(url).catch(() => {});
  };

  const lunchStr = scheduling?.lunch_start_time && scheduling?.lunch_end_time
    ? formatTimeRange(scheduling.lunch_start_time, scheduling.lunch_end_time)
    : null;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Branch</Text>
        {showEdit ? (
          <TouchableOpacity onPress={() => navigation.navigate('EditBranch', { branchId })} style={s.hBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color={C.indigo} />
          </TouchableOpacity>
        ) : (
          <View style={s.hBtnPlaceholder} />
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : loadError || !branch ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={C.textMuted} />
          <Text style={s.errTitle}>Could not load branch</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroCard}>
            <View style={[s.heroIcon, { backgroundColor: C.tealLight }]}>
              <Ionicons name="business" size={32} color={C.teal} />
            </View>
            <Text style={s.heroName}>{branch.name}</Text>
            <Text style={s.heroSub}>{fullAddress(branch)}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Contact</Text>
            <DetailRow
              label="Phone"
              value={branch.phone ?? '—'}
              icon="call-outline"
              onPress={branch.phone ? () => Linking.openURL(`tel:${branch.phone}`) : undefined}
            />
            <DetailRow label="Address" value={fullAddress(branch)} icon="location-outline" />
            {branch.map_url ? (
              <DetailRow label="Directions" value="Open in Maps" icon="map-outline" onPress={openMaps} />
            ) : null}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Scheduling</Text>
            <DetailRow
              label="Working hours"
              value={formatTimeRange(
                scheduling?.working_start_time ?? branch.working_start_time,
                scheduling?.working_end_time ?? branch.working_end_time,
              )}
              icon="time-outline"
            />
            {lunchStr ? (
              <DetailRow label="Lunch break" value={lunchStr} icon="cafe-outline" />
            ) : null}
            <DetailRow
              label="Working days"
              value={formatWorkingDays(scheduling?.working_days ?? branch.working_days)}
              icon="calendar-outline"
            />
            <DetailRow
              label="Slot duration"
              value={`${scheduling?.slot_duration ?? branch.slot_duration ?? 15} min`}
              icon="timer-outline"
            />
            <DetailRow
              label="Default appointment"
              value={`${scheduling?.default_appt_duration ?? branch.default_appt_duration ?? 30} min`}
              icon="medkit-outline"
            />
            {scheduling?.advance_booking_days != null ? (
              <DetailRow
                label="Advance booking"
                value={`${scheduling.advance_booking_days} days`}
                icon="today-outline"
              />
            ) : null}
          </View>

          {branch.book_now_url ? (
            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => Linking.openURL(branch.book_now_url!).catch(() => {})}
              activeOpacity={0.7}
            >
              <Ionicons name="link-outline" size={20} color={C.indigo} />
              <Text style={s.linkTxt}>Online booking link</Text>
              <Ionicons name="open-outline" size={16} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}

          {showEdit ? (
            <View style={s.actionsCard}>
              <Text style={s.cardTitle}>Manage</Text>
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => navigation.navigate('EditBranch', { branchId })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color={C.indigo} />
                  <Text style={s.actionBtnTxt}>Edit branch</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => navigation.navigate('BranchScheduling', { branchId })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color={C.indigo} />
                  <Text style={s.actionBtnTxt}>Scheduling</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  hBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  hBtnPlaceholder: { width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errTitle: { fontSize: 15, fontWeight: '600', color: C.textSub },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: C.indigo },
  retryTxt: { color: '#fff', fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  heroCard: { backgroundColor: C.surface, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  heroIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroName: { fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center' },
  heroSub: { fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.tealLight, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: C.text },
  rowLink: { color: C.indigo },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.indigoLight, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#c7d2fe' },
  linkTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: C.indigo },
  actionsCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.indigoLight,
  },
  actionBtnTxt: { fontSize: 13, fontWeight: '700', color: C.indigo },
});
