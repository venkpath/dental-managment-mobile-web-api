import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { userService } from '../../services/user.service';
import EmptyState from '../../components/EmptyState';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import { useAuthStore } from '../../store/auth.store';
import { canManageStaff } from '../../utils/permissions';
import { staffRoleMeta, staffStatusMeta } from '../../utils/staffRole';
import { radius } from '../../theme';
import type { ClinicUser, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  teal: '#0891b2', tealLight: '#ecfeff',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  amber: '#d97706', amberLight: '#fef3c7',
  gray: '#64748b', grayLight: '#f1f5f9',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

type RoleFilter = 'All' | 'Doctors' | 'Admin' | 'Receptionist' | 'Staff';

const ROLE_FILTERS: { key: RoleFilter; dot: string; apiRole?: string }[] = [
  { key: 'All', dot: C.indigo },
  { key: 'Doctors', dot: C.violet, apiRole: 'Dentist,Consultant' },
  { key: 'Admin', dot: C.indigo, apiRole: 'Admin' },
  { key: 'Receptionist', dot: C.teal, apiRole: 'Receptionist' },
  { key: 'Staff', dot: C.gray, apiRole: 'Staff' },
];

const SEARCH_DEBOUNCE_MS = 350;

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function StaffListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const { user } = useAuthStore();
  const showAdd = canManageStaff(user?.role);

  const [items, setItems] = useState<ClinicUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleRef = useRef(roleFilter);
  const searchRef = useRef(searchQuery);
  roleRef.current = roleFilter;
  searchRef.current = searchQuery;

  const cancelSearchDebounce = () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
  };

  const load = useCallback(async (
    role: RoleFilter = 'All',
    search = '',
    refresh = false,
  ) => {
    const seq = ++fetchSeq.current;
    if (refresh) setRefreshing(true);
    const def = ROLE_FILTERS.find((f) => f.key === role);
    try {
      const res = await userService.list({
        role: def?.apiRole,
        search: search.trim() || undefined,
      });
      if (seq !== fetchSeq.current) return;
      setLoadError(false);
      setItems(res);
    } catch {
      if (seq === fetchSeq.current) setLoadError(true);
    } finally {
      if (seq === fetchSeq.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const scheduleSearchReload = useCallback(() => {
    cancelSearchDebounce();
    searchTimer.current = setTimeout(() => {
      searchTimer.current = null;
      load(roleRef.current, searchRef.current);
    }, SEARCH_DEBOUNCE_MS);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      cancelSearchDebounce();
      load(roleRef.current, searchRef.current);
    }, [load]),
  );

  const applyRole = (key: RoleFilter) => {
    if (key === roleFilter) return;
    roleRef.current = key;
    setRoleFilter(key);
    cancelSearchDebounce();
    load(key, searchQuery);
  };

  const onSearchChange = (text: string) => {
    searchRef.current = text;
    setSearchQuery(text);
    scheduleSearchReload();
  };

  const onRefresh = () => {
    cancelSearchDebounce();
    load(roleFilter, searchQuery, true);
  };

  const countLabel = useMemo(() => {
    const n = items.length;
    return `${n} member${n === 1 ? '' : 's'}`;
  }, [items.length]);

  const renderItem = useCallback(({ item }: { item: ClinicUser }) => {
    const rm = staffRoleMeta(item.role, item.is_doctor);
    const sm = staffStatusMeta(item.status);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('StaffDetail', { userId: item.id })}
        style={s.card}
      >
        <View style={s.cardRow}>
          {item.profile_photo_url ? (
            <Image source={{ uri: item.profile_photo_url }} style={s.avatarImg} />
          ) : (
            <View style={[s.avatar, { backgroundColor: rm.bg }]}>
              <Text style={[s.avatarTxt, { color: rm.fg }]}>{initials(item.name)}</Text>
            </View>
          )}
          <View style={s.cardInfo}>
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
            <Text style={s.email} numberOfLines={1}>{item.email}</Text>
            <View style={s.metaRow}>
              {item.branch?.name ? (
                <>
                  <Ionicons name="business-outline" size={11} color={C.textMuted} />
                  <Text style={s.branchTxt} numberOfLines={1}>{item.branch.name}</Text>
                </>
              ) : (
                <Text style={s.branchTxt}>All branches</Text>
              )}
            </View>
          </View>
          <View style={s.cardRight}>
            <View style={[s.pill, { backgroundColor: rm.bg }]}>
              <Text style={[s.pillTxt, { color: rm.fg }]}>{rm.label}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: sm.bg }]}>
              <Text style={[s.pillTxt, { color: sm.fg }]}>{sm.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.heading}>Staff</Text>
          <Text style={s.subtitle}>{countLabel}</Text>
        </View>
        {showAdd ? (
          <TouchableOpacity onPress={() => navigation.navigate('AddStaff')} style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={24} color={C.indigo} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name or email"
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersRow}
        contentContainerStyle={s.filtersContent}
      >
        {ROLE_FILTERS.map((f) => {
          const active = roleFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterTab, active && s.filterTabActive]}
              onPress={() => applyRole(f.key)}
              activeOpacity={0.7}
            >
              {!active && <View style={[s.filterDot, { backgroundColor: f.dot }]} />}
              <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{f.key}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {initialLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(12, bottomInset) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.indigo]} />}
          ListEmptyComponent={
            loadError ? (
              <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="alert-circle" />
            ) : (
              <EmptyState
                title="No staff found"
                subtitle={searchQuery.trim() ? `No results for "${searchQuery}"` : 'No team members match this filter'}
                icon="people-outline"
              />
            )
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  titleBlock: { flex: 1 },
  heading: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  filtersRow: { flexGrow: 0, backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: C.bg, gap: 5 },
  filterTabActive: { backgroundColor: C.indigo },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterTabText: { fontSize: 12, fontWeight: '500', color: C.textSub },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.grayLight },
  avatarTxt: { fontSize: 14, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  email: { fontSize: 12, color: C.textSub },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchTxt: { fontSize: 11, color: C.textMuted, flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillTxt: { fontSize: 10, fontWeight: '700' },
});
