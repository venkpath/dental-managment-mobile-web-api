import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { treatmentService } from '../../services/treatment.service';
import { formatCurrency } from '../../utils/format';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Treatment, PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'PatientTreatments'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const PROCEDURE_ICON: Record<string, string> = {
  'Root Canal Treatment': '🦷', 'Extraction': '🪥', 'Filling': '🔵',
  'Crown': '👑', 'Bridge': '🔗', 'Scaling': '✨', 'Implant': '⚙️',
  'Orthodontics': '📐', 'Denture': '😁', 'Teeth Whitening': '⭐',
};

export default function TreatmentListScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId, patientName } = route.params;
  const bottomInset = useBottomInset();

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await treatmentService.listByPatient(patientId);
      setTreatments(data);
    } catch {
      Alert.alert('Error', 'Failed to load treatments. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Treatment }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('EditTreatment', { treatmentId: item.id })}
    >
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[
            styles.statusStrip,
            item.status === 'COMPLETED' && styles.stripDone,
            item.status === 'IN_PROGRESS' && styles.stripProgress,
          ]} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.procedure}>
              {PROCEDURE_ICON[item.procedure] ?? '🦷'} {item.procedure}
            </Text>
            <Badge label={item.status} variant={item.status as any} showDot={false} />
          </View>
          {item.tooth_number && (
            <Text style={styles.toothNum}>Tooth #{item.tooth_number}</Text>
          )}
          <Text style={styles.diagnosis} numberOfLines={1}>{item.diagnosis}</Text>
          <View style={styles.cardBottom}>
            <Text style={styles.cost}>{formatCurrency(Number(item.cost))}</Text>
            <Text style={styles.dentist}>Dr. {item.dentist.name}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Treatments"
        subtitle={patientName}
        onBack={() => navigation.goBack()}
        rightElement={
          <Button
            title="+ Add"
            onPress={() => navigation.navigate('AddTreatment', { patientId, patientName })}
            size="sm"
          />
        }
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={treatments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState title="No treatments yet" subtitle="Tap + Add to record the first treatment" icon="🦷" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.base, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  cardLeft: { width: 5 },
  statusStrip: { flex: 1, backgroundColor: colors.purple },
  stripDone: { backgroundColor: colors.success },
  stripProgress: { backgroundColor: colors.warning },
  cardBody: { flex: 1, padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  procedure: { fontSize: typography.base, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  toothNum: { fontSize: typography.xs, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  diagnosis: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cost: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  dentist: { fontSize: typography.xs, color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.textMuted, alignSelf: 'center', paddingHorizontal: spacing.sm },
});
