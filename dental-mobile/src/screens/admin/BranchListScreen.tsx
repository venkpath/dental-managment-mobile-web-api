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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { branchService } from '../../services/branch.service';
import { formatTimeRange } from '../../utils/workingDays';
import EmptyState from '../../components/EmptyState';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import { useAuthStore } from '../../store/auth.store';
import { canManageBranches } from '../../utils/permissions';
import type { Branch, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  teal: '#0891b2', tealLight: '#ecfeff',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

function locationLine(b: Branch): string {
  const parts = [b.city, b.state].filter(Boolean);
  return parts.length ? parts.join(', ') : (b.address?.trim() || '—');
}

export default function BranchListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const { user } = useAuthStore();
  const showAdd = canManageBranches(user?.role);

  const [items, setItems] = useState<Branch[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSeq = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const seq = ++fetchSeq.current;
    if (refresh) setRefreshing(true);
    try {
      const res = await branchService.list();
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.city ?? '').toLowerCase().includes(q) ||
      (b.address ?? '').toLowerCase().includes(q) ||
      (b.phone ?? '').includes(q),
    );
  }, [items, searchQuery]);

  const renderItem = useCallback(({ item }: { item: Branch }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('BranchDetail', { branchId: item.id })}
      style={s.card}
    >
      <View style={s.cardRow}>
        <View style={[s.iconBox, { backgroundColor: C.tealLight }]}>
          <Ionicons name="business" size={20} color={C.teal} />
        </View>
        <View style={s.cardInfo}>
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          <Text style={s.location} numberOfLines={1}>{locationLine(item)}</Text>
          <View style={s.metaRow}>
            <Ionicons name="time-outline" size={11} color={C.textMuted} />
            <Text style={s.hours}>
              {formatTimeRange(item.working_start_time, item.working_end_time)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.heading}>Branches</Text>
          <Text style={s.subtitle}>{items.length} location{items.length === 1 ? '' : 's'}</Text>
        </View>
        {showAdd ? (
          <TouchableOpacity onPress={() => navigation.navigate('AddBranch')} style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={24} color={C.indigo} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search branch, city or address"
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      </View>

      {initialLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(12, bottomInset) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.indigo]} />}
          ListEmptyComponent={
            loadError ? (
              <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="alert-circle" />
            ) : (
              <EmptyState
                title="No branches"
                subtitle={searchQuery.trim() ? `No results for "${searchQuery}"` : 'No branches configured yet'}
                icon="business-outline"
              />
            )
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
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  titleBlock: { flex: 1 },
  heading: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  list: { paddingHorizontal: 16, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  location: { fontSize: 12, color: C.textSub },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hours: { fontSize: 11, color: C.textMuted },
});
