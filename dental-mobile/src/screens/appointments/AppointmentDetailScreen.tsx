import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/appointment.service';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, spacing, typography, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Appointment, AppointmentStackParamList } from '../../types';

type Route = RouteProp<AppointmentStackParamList, 'AppointmentDetail'>;
type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

const STATUS_ACTIONS: { label: string; status: Appointment['status']; color: string }[] = [
  { label: '✅ Mark Completed', status: 'completed', color: colors.success },
  { label: '❌ Mark No Show',   status: 'no_show',   color: colors.warning },
  { label: '🚫 Cancel',         status: 'cancelled', color: colors.danger },
];

export default function AppointmentDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { appointmentId } = route.params;
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [reschedule, setReschedule] = useState({ date: '', start_time: '', end_time: '' });
  const bottomInset = useBottomInset();

  useFocusEffect(
    useCallback(() => {
      appointmentService.get(appointmentId).then((a) => {
        setAppointment(a);
        setReschedule({
          date: a.appointment_date,
          start_time: a.start_time,
          end_time: a.end_time,
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    }, [appointmentId])
  );

  const updateStatus = (status: Appointment['status'], label: string) => {
    Alert.alert(
      'Update Status',
      `Change status to "${label.replace(/[^a-zA-Z ]/g, '').trim()}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              const updated = await appointmentService.updateStatus(appointmentId, status);
              setAppointment(updated);
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleReschedule = async () => {
    if (!reschedule.date || !reschedule.start_time) {
      Alert.alert('Error', 'Date and start time are required');
      return;
    }
    setUpdating(true);
    try {
      const updated = await appointmentService.reschedule(appointmentId, {
        appointment_date: reschedule.date,
        start_time: reschedule.start_time,
        end_time: reschedule.end_time || addMinutes(reschedule.start_time, 30),
      });
      setAppointment(updated);
      setShowReschedule(false);
      Alert.alert('Done', 'Appointment rescheduled.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Appointment" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Appointment" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={styles.errorText}>Appointment not found</Text></View>
      </SafeAreaView>
    );
  }

  const canUpdate = appointment.status === 'scheduled';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Appointment Details" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Badge label={appointment.status} variant={appointment.status} />
          <Text style={styles.dateTime}>
            {new Date(appointment.appointment_date).toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
          <Text style={styles.time}>{appointment.start_time} – {appointment.end_time}</Text>
        </View>

        {/* Patient */}
        <Card>
          <Text style={styles.cardTitle}>Patient</Text>
          <Text style={styles.bigName}>
            {appointment.patient.first_name} {appointment.patient.last_name}
          </Text>
          <Text style={styles.infoText}>📞 {appointment.patient.phone}</Text>
        </Card>

        {/* Dentist */}
        <Card>
          <Text style={styles.cardTitle}>Dentist</Text>
          <Text style={styles.bigName}>Dr. {appointment.dentist.name}</Text>
          {appointment.branch && (
            <Text style={styles.infoText}>🏥 {appointment.branch.name}</Text>
          )}
        </Card>

        {/* Notes */}
        {appointment.notes && (
          <Card>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </Card>
        )}

        {/* Reschedule */}
        {canUpdate && (
          <>
            <TouchableOpacity
              style={styles.rescheduleToggle}
              onPress={() => setShowReschedule((p) => !p)}
            >
              <Text style={styles.rescheduleToggleText}>
                📅 {showReschedule ? 'Cancel Reschedule' : 'Reschedule Appointment'}
              </Text>
              <Text style={styles.chevron}>{showReschedule ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showReschedule && (
              <View style={styles.rescheduleForm}>
                <Input
                  label="New Date"
                  value={reschedule.date}
                  onChangeText={(v) => setReschedule((p) => ({ ...p, date: v }))}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />

                <Text style={styles.fieldLabel}>Time Slot</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowSlots((p) => !p)}
                >
                  <Text style={[styles.selectorText, !reschedule.start_time && styles.placeholder]}>
                    {reschedule.start_time
                      ? `${reschedule.start_time} – ${reschedule.end_time}`
                      : 'Select time slot'}
                  </Text>
                  <Text style={styles.chevron}>{showSlots ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showSlots && (
                  <View style={styles.slotsGrid}>
                    {TIME_SLOTS.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slotBtn, reschedule.start_time === slot && styles.slotBtnActive]}
                        onPress={() => {
                          setReschedule((p) => ({
                            ...p, start_time: slot, end_time: addMinutes(slot, 30),
                          }));
                          setShowSlots(false);
                        }}
                      >
                        <Text style={[styles.slotText, reschedule.start_time === slot && styles.slotTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Button
                  title="Confirm Reschedule"
                  onPress={handleReschedule}
                  loading={updating}
                  size="md"
                />
              </View>
            )}
          </>
        )}

        {/* Status Actions */}
        {canUpdate && (
          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>Update Status</Text>
            {STATUS_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.status}
                style={[styles.actionRow, { borderColor: action.color }]}
                onPress={() => updateStatus(action.status, action.label)}
                disabled={updating}
              >
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {updating && !showReschedule && (
          <View style={styles.updatingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.updatingText}>Updating...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: typography.base, color: colors.textSecondary },
  statusBanner: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.base, alignItems: 'center', gap: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  dateTime: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  time: { fontSize: typography['2xl'], fontWeight: '700', color: colors.primary },
  cardTitle: {
    fontSize: typography.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  bigName: { fontSize: typography.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  infoText: { fontSize: typography.base, color: colors.textSecondary },
  notesText: { fontSize: typography.base, color: colors.text, lineHeight: 22 },
  rescheduleToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.primary,
  },
  rescheduleToggleText: { fontSize: typography.base, fontWeight: '600', color: colors.primary },
  rescheduleForm: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  fieldLabel: { fontSize: typography.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    minHeight: 50,
  },
  selectorText: { fontSize: typography.base, color: colors.text },
  placeholder: { color: colors.textMuted },
  chevron: { fontSize: 12, color: colors.textMuted },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.xs },
  slotBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  slotText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
  slotTextActive: { color: colors.primary, fontWeight: '700' },
  actionsSection: { gap: spacing.sm },
  actionsTitle: {
    fontSize: typography.sm, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  actionRow: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1.5, alignItems: 'center',
  },
  actionLabel: { fontSize: typography.base, fontWeight: '600' },
  updatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  updatingText: { fontSize: typography.sm, color: colors.textSecondary },
});
