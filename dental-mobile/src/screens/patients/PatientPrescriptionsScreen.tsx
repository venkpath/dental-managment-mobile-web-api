import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { userService, type Prescription } from '../../services/user.service';
import api from '../../services/api';
import { getLocale } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'PatientPrescriptions'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

export default function PatientPrescriptionsScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId, patientName } = route.params;
  const bottomInset = useBottomInset();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await userService.listPrescriptions(patientId);
      setPrescriptions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSendWhatsApp = async (prescriptionId: string) => {
    setSendingId(prescriptionId);
    try {
      await api.post(`/prescriptions/${prescriptionId}/send-whatsapp`);
      Alert.alert('Sent', 'Prescription sent to patient via WhatsApp');
    } catch {
      Alert.alert('Error', 'Failed to send WhatsApp');
    } finally {
      setSendingId(null);
    }
  };

  const renderItem = ({ item }: { item: Prescription }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.date}>
            📅 {new Date(item.created_at).toLocaleDateString(getLocale(), {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
          <Text style={styles.dentist}>Dr. {item.dentist.name}</Text>
        </View>
        <View style={styles.rxBadge}>
          <Text style={styles.rxText}>Rx</Text>
        </View>
      </View>

      {item.diagnosis && (
        <Text style={styles.diagnosis}>Diagnosis: {item.diagnosis}</Text>
      )}

      {item.items && item.items.length > 0 && (
        <View style={styles.medicinesList}>
          {item.items.map((med, idx) => (
            <View key={idx} style={styles.medicineRow}>
              <View style={styles.medicineDot} />
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{med.medicine_name}</Text>
                {(med.dosage || med.frequency || med.duration) && (
                  <Text style={styles.medicineDetails}>
                    {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {med.notes && (
                  <Text style={styles.medicineInstructions}>{med.notes}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {item.instructions && (
        <Text style={styles.notes}>📝 {item.instructions}</Text>
      )}

      <TouchableOpacity
        style={[styles.whatsappBtn, sendingId === item.id && styles.whatsappBtnDisabled]}
        onPress={() => handleSendWhatsApp(item.id)}
        disabled={sendingId === item.id}
      >
        <Text style={styles.whatsappBtnText}>
          {sendingId === item.id ? 'Sending...' : '📤 Send WhatsApp'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Prescriptions"
        subtitle={patientName}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: spacing['2xl'] + bottomInset }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No prescriptions"
              subtitle="No prescriptions recorded for this patient"
              icon="💊"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.base, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: { flex: 1 },
  date: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  dentist: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  rxBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rxText: { fontSize: typography.sm, fontWeight: '800', color: colors.white, fontStyle: 'italic' },
  diagnosis: {
    fontSize: typography.sm, color: colors.textSecondary,
    marginBottom: spacing.sm, fontStyle: 'italic',
  },
  medicinesList: { gap: spacing.sm },
  medicineRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  medicineDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.primary, marginTop: 5,
  },
  medicineInfo: { flex: 1 },
  medicineName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  medicineDetails: { fontSize: typography.xs, color: colors.primary, marginTop: 1 },
  medicineInstructions: { fontSize: typography.xs, color: colors.textMuted, marginTop: 1 },
  notes: { fontSize: typography.xs, color: colors.textMuted, marginTop: spacing.sm },
  whatsappBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#25D366',
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  whatsappBtnDisabled: { borderColor: colors.border, opacity: 0.6 },
  whatsappBtnText: { fontSize: typography.xs, fontWeight: '600', color: '#128C7E' },
});
