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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, typography, radius, shadow } from '../../theme';
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
      style={styles.patientCard}
    >
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={12} color={colors.textMuted} />
            <Text style={styles.phone}>{item.phone}</Text>
          </View>
          {item.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
              <Text style={styles.email}>{item.email}</Text>
            </View>
          )}
        </View>
        <View style={styles.meta}>
          {item.gender && (
            <View style={[styles.genderBadge, {
              backgroundColor: item.gender === 'Male' ? '#dbeafe' : item.gender === 'Female' ? '#fce7f3' : '#f1f5f9',
            }]}>
              <Ionicons
                name={item.gender === 'Male' ? 'male' : item.gender === 'Female' ? 'female' : 'male-female'}
                size={14}
                color={item.gender === 'Male' ? '#2563eb' : item.gender === 'Female' ? '#db2777' : '#64748b'}
              />
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
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
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.white} />
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
              <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="alert-circle" />
            ) : (
              <EmptyState
                title="No patients found"
                subtitle={search ? `No results for "${search}"` : 'Add your first patient to get started'}
                icon="people-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} />
              : hasMore
              ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore} activeOpacity={0.7}>
                  <Text style={styles.loadMoreText}>Load More</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.primary} />
                </TouchableOpacity>
              )
              : patients.length > 0
              ? <Text style={styles.endText}>All patients loaded</Text>
              : null
          }
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
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  addBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.colored(colors.primary),
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  patientCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  info: { flex: 1, gap: 2 },
  name: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  phone: { fontSize: typography.sm, color: colors.textSecondary },
  email: { fontSize: typography.xs, color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  genderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadMoreBtn: {
    margin: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  loadMoreText: { fontSize: typography.sm, fontWeight: '600', color: colors.primary },
  endText: { textAlign: 'center', fontSize: typography.xs, color: colors.textMuted, padding: spacing.md },
});
