import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Patient, PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'PatientDetail'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function PatientDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId } = route.params;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomInset = useBottomInset();

  useFocusEffect(
    useCallback(() => {
      patientService.get(patientId).then((p) => {
        setPatient(p);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, [patientId])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Patient" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Patient" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Patient not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${patient.first_name} ${patient.last_name}`;
  const initials = `${patient.first_name[0] ?? ''}${patient.last_name[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Patient Profile"
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{fullName}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${patient.phone}`)}>
                <Text style={styles.profilePhone}>📞 {patient.phone}</Text>
              </TouchableOpacity>
              {patient.email && (
                <Text style={styles.profileEmail}>✉️ {patient.email}</Text>
              )}
            </View>
          </View>
          <View style={styles.badgeRow}>
            {patient.gender && (
              <Badge
                label={patient.gender}
                variant="default"
              />
            )}
            {patient.blood_group && (
              <View style={styles.bloodGroup}>
                <Text style={styles.bloodGroupText}>🩸 {patient.blood_group}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <InfoRow label="Date of Birth" value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-IN') : null} />
          <InfoRow label="Branch" value={patient.branch?.name} />
          <InfoRow label="Registered On" value={new Date(patient.created_at).toLocaleDateString('en-IN')} />
        </Card>

        {/* Medical notes */}
        {patient.notes && (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{patient.notes}</Text>
          </Card>
        )}

        {/* Quick Actions — contact */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`tel:${patient.phone}`)}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`https://wa.me/91${patient.phone}`)}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('EditPatient', { patientId })}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Patient records */}
        <Text style={styles.recordsLabel}>Records</Text>
        <View style={styles.recordsGrid}>
          <TouchableOpacity
            style={styles.recordCard}
            onPress={() => navigation.navigate('PatientTreatments', { patientId, patientName: fullName })}
          >
            <Text style={styles.recordIcon}>🦷</Text>
            <Text style={styles.recordTitle}>Treatments</Text>
            <Text style={styles.recordArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.recordCard}
            onPress={() => navigation.navigate('PatientPrescriptions', { patientId, patientName: fullName })}
          >
            <Text style={styles.recordIcon}>💊</Text>
            <Text style={styles.recordTitle}>Prescriptions</Text>
            <Text style={styles.recordArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.md, paddingBottom: spacing['2xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: typography.base, color: colors.textSecondary },
  profileCard: {},
  profileRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: typography.xl, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  profileName: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  profilePhone: { fontSize: typography.base, color: colors.primary },
  profileEmail: { fontSize: typography.sm, color: colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  bloodGroup: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: '#fee2e2',
  },
  bloodGroupText: { fontSize: typography.xs, fontWeight: '600', color: colors.danger },
  detailsCard: {},
  sectionTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: { fontSize: typography.sm, color: colors.textSecondary },
  infoValue: { fontSize: typography.sm, fontWeight: '500', color: colors.text },
  notes: { fontSize: typography.base, color: colors.text, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: { fontSize: 24 },
  actionText: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  recordsLabel: {
    fontSize: typography.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.sm, marginTop: spacing.xs,
  },
  recordsGrid: { gap: spacing.sm },
  recordCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  recordIcon: { fontSize: 22 },
  recordTitle: { flex: 1, fontSize: typography.base, fontWeight: '600', color: colors.text },
  recordArrow: { fontSize: 20, color: colors.textMuted },
});
