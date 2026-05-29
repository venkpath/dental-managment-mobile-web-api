import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  membershipsService,
  type MembershipPlan,
  type MembershipEnrollment,
} from '../../services/memberships.service';
import { formatCurrency, getLocale } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;
type Tab = 'plans' | 'enrollments';

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  red: '#dc2626', redLight: '#fee2e2',
  gray: '#64748b', grayLight: '#f1f5f9',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

const ENROLL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'paused', label: 'Paused' },
] as const;

function planStatus(p: MembershipPlan) {
  return p.is_active === false
    ? { bg: C.grayLight, fg: C.gray, label: 'Inactive' }
    : { bg: C.greenLight, fg: C.green, label: 'Active' };
}

function enrollStatus(s?: string) {
  switch (s) {
    case 'active': return { bg: C.greenLight, fg: C.green, label: 'Active' };
    case 'expired': return { bg: C.amberLight, fg: C.amber, label: 'Expired' };
    case 'cancelled': return { bg: C.redLight, fg: C.red, label: 'Cancelled' };
    case 'paused': return { bg: C.grayLight, fg: C.gray, label: 'Paused' };
    default: return { bg: C.indigoLight, fg: C.indigo, label: s ?? '—' };
  }
}

export default function MembershipListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [tab, setTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [enrollments, setEnrollments] = useState<MembershipEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [enrollFilter, setEnrollFilter] = useState<string>('all');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [p, e] = await Promise.all([
        membershipsService.listPlans(),
        membershipsService.listEnrollments(
          enrollFilter !== 'all' ? { status: enrollFilter } : undefined,
        ),
      ]);
      setPlans(p);
      setEnrollments(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enrollFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.code ?? '').toLowerCase().includes(q),
    );
  }, [plans, search]);

  const filteredEnrollments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter((e) => {
      const name = `${e.primary_patient?.first_name ?? ''} ${e.primary_patient?.last_name ?? ''}`.toLowerCase();
      return (
        name.includes(q) ||
        (e.enrollment_number ?? '').toLowerCase().includes(q) ||
        (e.membership_plan?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [enrollments, search]);

  const renderPlan = ({ item }: { item: MembershipPlan }) => {
    const st = planStatus(item);
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('MembershipPlanDetail', { planId: item.id })}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, { backgroundColor: C.indigoLight }]}>
            <Ionicons name="shield-checkmark" size={22} color={C.indigo} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.code ? <Text style={s.cardSub}>#{item.code}</Text> : null}
            <Text style={s.cardMeta}>
              {formatCurrency(Number(item.price))} · {item.duration_months ?? 12} mo · up to {item.max_members ?? 1} members
            </Text>
          </View>
          <View style={[s.pill, { backgroundColor: st.bg }]}>
            <Text style={[s.pillTxt, { color: st.fg }]}>{st.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEnrollment = ({ item }: { item: MembershipEnrollment }) => {
    const st = enrollStatus(item.status);
    const patient = item.primary_patient;
    const name = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('MembershipEnrollmentDetail', { enrollmentId: item.id })}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, { backgroundColor: C.greenLight }]}>
            <Ionicons name="card" size={20} color={C.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{name}</Text>
            <Text style={s.cardSub} numberOfLines={1}>
              {item.membership_plan?.name ?? 'Plan'} · {item.enrollment_number ?? item.id.slice(0, 8)}
            </Text>
            {item.start_date && (
              <Text style={s.cardMeta}>
                {new Date(item.start_date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                {item.end_date ? ` – ${new Date(item.end_date).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              </Text>
            )}
          </View>
          <View style={[s.pill, { backgroundColor: st.bg }]}>
            <Text style={[s.pillTxt, { color: st.fg }]}>{st.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Memberships</Text>
          <Text style={s.subtitle}>Plans & patient enrollments</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            if (tab === 'plans') navigation.navigate('AddMembershipPlan');
            else navigation.navigate('EnrollMembership', {});
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {(['plans', 'enrollments'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabOn]}
            onPress={() => { setTab(t); setSearch(''); }}
            activeOpacity={0.7}
          >
            <Text style={[s.tabTxt, tab === t && s.tabTxtOn]}>
              {t === 'plans' ? 'Plans' : 'Enrollments'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder={tab === 'plans' ? 'Search plans…' : 'Search patient or enrollment #…'}
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {tab === 'enrollments' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {ENROLL_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, enrollFilter === f.key && s.filterChipOn]}
              onPress={() => {
                setEnrollFilter(f.key);
                setLoading(true);
                membershipsService
                  .listEnrollments(f.key !== 'all' ? { status: f.key } : undefined)
                  .then(setEnrollments)
                  .finally(() => setLoading(false));
              }}
              activeOpacity={0.7}
            >
              <Text style={[s.filterTxt, enrollFilter === f.key && s.filterTxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : tab === 'plans' ? (
          <FlatList
            data={filteredPlans}
            keyExtractor={(item) => item.id}
            renderItem={renderPlan}
            contentContainerStyle={[s.list, { paddingBottom: 16 + bottomInset }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.indigo]} />}
            ListEmptyComponent={
              <EmptyState title="No plans" subtitle="Create a membership plan to get started" icon="shield-outline" />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={filteredEnrollments}
            keyExtractor={(item) => item.id}
            renderItem={renderEnrollment}
            contentContainerStyle={[s.list, { paddingBottom: 16 + bottomInset }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.indigo]} />}
            ListEmptyComponent={
              <EmptyState title="No enrollments" subtitle="Enroll a patient in a plan" icon="shield-outline" />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.indigo,
    alignItems: 'center', justifyContent: 'center',
  },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  tabOn: { backgroundColor: C.indigo, borderColor: C.indigo },
  tabTxt: { fontSize: 14, fontWeight: '600', color: C.textSub },
  tabTxtOn: { color: '#fff', fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  filterChipOn: { backgroundColor: C.indigo, borderColor: C.indigo },
  filterTxt: { fontSize: 12, fontWeight: '600', color: C.textSub },
  filterTxtOn: { color: '#fff' },
  list: { paddingHorizontal: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  cardSub: { fontSize: 12, fontWeight: '600', color: C.indigo, marginTop: 2 },
  cardMeta: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillTxt: { fontSize: 10, fontWeight: '700' },
});
