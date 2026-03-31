import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Patient, PatientStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

export default function PatientListScreen() {
  const navigation = useNavigation<Nav>();
  const bottomInset = useBottomInset();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadPatients = useCallback(async (p = 1, q = '', refresh = false) => {
    if (p === 1) refresh ? setRefreshing(true) : setLoading(true);
    else setLoadingMore(true);
    try {
      setLoadError(false);
      const res = await patientService.list(p, q);
      const items = res.data || [];
      setPatients(p === 1 ? items : (prev) => [...prev, ...items]);
      setHasMore(p < (res.meta?.totalPages ?? 1));
      setPage(p);
    } catch {
      if (p === 1) setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPatients(1, search);
    }, [loadPatients, search])
  );

  const onRefresh = () => loadPatients(1, search, true);
  const onLoadMore = () => {
    if (!loadingMore && hasMore) loadPatients(page + 1, search);
  };

  const onSearch = (text: string) => {
    setSearch(text);
    loadPatients(1, text);
  };

  const initials = (p: Patient) =>
    `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase();

  const renderItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={styles.patientCard} padding={spacing.md}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {item.email && <Text style={styles.email}>{item.email}</Text>}
          </View>
          <View style={styles.meta}>
            {item.gender && (
              <Text style={styles.genderBadge}>{item.gender === 'Male' ? '♂' : item.gender === 'Female' ? '♀' : '⚥'}</Text>
            )}
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={onSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddPatient')}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            loadError ? (
              <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="⚠️" />
            ) : (
              <EmptyState
                title="No patients found"
                subtitle={search ? `No results for "${search}"` : 'Add your first patient to get started'}
                icon="👤"
              />
            )
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.base,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.sm },
  list: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing['2xl'] },
  patientCard: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: typography.base, fontWeight: '700', color: colors.primary },
  info: { flex: 1 },
  name: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  phone: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 1 },
  email: { fontSize: typography.xs, color: colors.textMuted, marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  genderBadge: { fontSize: 16 },
  chevron: { fontSize: 20, color: colors.textMuted, fontWeight: '300' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
