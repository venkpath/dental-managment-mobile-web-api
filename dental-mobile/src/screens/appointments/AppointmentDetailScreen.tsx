import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { appointmentService } from '../../services/appointment.service';
import { addMinutes } from '../../utils/time';
import { getLocale } from '../../utils/format';
import { formatSlotRange, formatTime12h } from '../../utils/appointmentSlots';
import DatePickerInput from '../../components/DatePickerInput';
import AppointmentSlotPicker from '../../components/AppointmentSlotPicker';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { AvailableSlot } from '../../types';
import type { Appointment, AppointmentStatus, AppointmentStackParamList } from '../../types';

type Route = RouteProp<AppointmentStackParamList, 'AppointmentDetail'>;
type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  red: '#dc2626', redLight: '#fee2e2',
  teal: '#0891b2', tealLight: '#ecfeff',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  orange: '#ea580c', orangeLight: '#ffedd5',
  gray: '#64748b', grayLight: '#f1f5f9',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6',
};

function statusMeta(status: AppointmentStatus) {
  switch (status) {
    case 'scheduled':   return { bg: C.indigoLight, fg: C.indigo, label: 'Scheduled' };
    case 'checked_in':  return { bg: C.tealLight,   fg: C.teal,   label: 'Checked In' };
    case 'in_progress': return { bg: C.violetLight, fg: C.violet, label: 'In Progress' };
    case 'completed':   return { bg: C.greenLight,  fg: C.green,  label: 'Completed' };
    case 'cancelled':   return { bg: C.redLight,    fg: C.red,    label: 'Cancelled' };
    case 'no_show':     return { bg: C.amberLight,  fg: C.amber,  label: 'No Show' };
    default:            return { bg: C.grayLight,   fg: C.gray,   label: String(status) };
  }
}

function isPastAppointment(appt: Appointment): boolean {
  const now = new Date();
  const d = new Date(appt.appointment_date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const apptDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (apptDay < today) return true;
  if (apptDay.getTime() === today.getTime() && appt.end_time) {
    const [h, m] = appt.end_time.split(':').map(Number);
    return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
  }
  return false;
}

const fmtTime = (t?: string) => (t ? formatTime12h(t) : '—');

interface ActionBtn {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
  status: AppointmentStatus;
  confirm: string;
}

export default function AppointmentDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { appointmentId } = route.params;

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [reschedule, setReschedule] = useState({ date: '', start_time: '', end_time: '' });

  const load = useCallback(() => {
    setLoading(true);
    appointmentService.get(appointmentId)
      .then((a) => {
        setAppt(a);
        setReschedule({ date: a.appointment_date.split('T')[0], start_time: a.start_time, end_time: a.end_time });
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = (status: AppointmentStatus, confirm: string) => {
    Alert.alert('Update status', confirm, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setUpdating(true);
          try {
            const updated = await appointmentService.updateStatus(appointmentId, status);
            setAppt(updated);
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const loadSlots = async (date: string) => {
    if (!appt?.branch_id || !appt.dentist_id) return;
    setSlotsLoading(true);
    try {
      const data = await appointmentService.getAvailableSlots({
        branch_id: appt.branch_id,
        dentist_id: appt.dentist_id,
        date,
      });
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const openReschedule = () => {
    if (!appt) return;
    setReschedule({
      date: appt.appointment_date.split('T')[0],
      start_time: appt.start_time,
      end_time: appt.end_time,
    });
    setRescheduleOpen(true);
    loadSlots(appt.appointment_date.split('T')[0]);
  };

  const handleReschedule = async () => {
    if (!reschedule.date || !reschedule.start_time) {
      Alert.alert('Required', 'Date and time slot are required.');
      return;
    }
    setUpdating(true);
    try {
      const updated = await appointmentService.reschedule(appointmentId, {
        appointment_date: reschedule.date,
        start_time: reschedule.start_time,
        end_time: reschedule.end_time || addMinutes(reschedule.start_time, 30),
      });
      setAppt(updated);
      setRescheduleOpen(false);
      Alert.alert('Done', 'Appointment rescheduled.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete appointment', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await appointmentService.delete(appointmentId);
            navigation.goBack();
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const Header = (
    <View style={[s.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <View style={s.hTitleBlock}>
        <Text style={s.hTitle}>Appointment</Text>
        {appt && (
          <Text style={s.hSub} numberOfLines={1}>
            {appt.patient.first_name} {appt.patient.last_name}
          </Text>
        )}
      </View>
      {appt && (appt.status === 'scheduled' || appt.status === 'checked_in') && (
        <TouchableOpacity onPress={openReschedule} style={s.hBtn} activeOpacity={0.7} disabled={updating}>
          <Ionicons name="calendar-outline" size={20} color={C.indigo} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  if (!appt) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
          <Text style={s.errText}>{loadError ? 'Failed to load appointment.' : 'Appointment not found.'}</Text>
        </View>
      </View>
    );
  }

  const sm = statusMeta(appt.status);
  const pastDue = (appt.status === 'scheduled' || appt.status === 'checked_in') && isPastAppointment(appt);
  const isScheduled = appt.status === 'scheduled';
  const isCheckedIn = appt.status === 'checked_in';
  const isInProgress = appt.status === 'in_progress';
  const isTerminal = appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show';

  const actions: ActionBtn[] = [];
  if (isScheduled) {
    actions.push({ key: 'checkin', label: 'Check In', icon: 'enter-outline', color: C.teal, bg: C.tealLight, status: 'checked_in', confirm: 'Check in this patient?' });
    actions.push({ key: 'noshow', label: 'No Show', icon: 'alert-circle-outline', color: C.amber, bg: C.amberLight, status: 'no_show', confirm: 'Mark as no show?' });
    actions.push({ key: 'cancel', label: 'Cancel', icon: 'close-circle-outline', color: C.red, bg: C.redLight, status: 'cancelled', confirm: 'Cancel this appointment?' });
  }
  if (isCheckedIn || isInProgress) {
    actions.push({ key: 'complete', label: 'Complete', icon: 'checkmark-circle-outline', color: C.green, bg: C.greenLight, status: 'completed', confirm: 'Mark appointment as completed?' });
    actions.push({ key: 'cancel2', label: 'Cancel', icon: 'close-circle-outline', color: C.red, bg: C.redLight, status: 'cancelled', confirm: 'Cancel this appointment?' });
  }

  return (
    <View style={s.screen}>
      {Header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: 24 + bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Schedule hero */}
        <View style={s.card}>
          <View style={s.heroTop}>
            <View style={[s.statusPill, { backgroundColor: sm.bg }]}>
              <Text style={[s.statusPillTxt, { color: sm.fg }]}>{sm.label}</Text>
            </View>
            {pastDue && (
              <View style={s.pastDuePill}><Text style={s.pastDueTxt}>Past Due</Text></View>
            )}
          </View>
          <Text style={s.heroDate}>
            {new Date(appt.appointment_date).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <View style={s.timeRow}>
            <Ionicons name="time-outline" size={18} color={C.indigo} />
            <Text style={s.heroTime}>{fmtTime(appt.start_time)} – {fmtTime(appt.end_time)}</Text>
          </View>
        </View>

        {/* Patient */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>PATIENT</Text>
          <Text style={s.partyName}>{appt.patient.first_name} {appt.patient.last_name}</Text>
          {appt.patient.phone ? (
            <TouchableOpacity style={s.phoneRow} onPress={() => Linking.openURL(`tel:${appt.patient.phone}`)} activeOpacity={0.7}>
              <Ionicons name="call-outline" size={16} color={C.indigo} />
              <Text style={s.phoneTxt}>{appt.patient.phone}</Text>
            </TouchableOpacity>
          ) : null}
          <View style={s.twoCol}>
            <View style={s.colHalf}>
              <Text style={s.fieldLabel}>DOCTOR</Text>
              <Text style={s.colValue}>Dr. {appt.dentist.name}</Text>
            </View>
            <View style={s.colHalf}>
              <Text style={s.fieldLabel}>BRANCH</Text>
              <Text style={s.colValue}>{appt.branch?.name ?? '—'}</Text>
            </View>
          </View>
        </View>

        {appt.notes ? (
          <View style={s.card}>
            <View style={s.sectionHead}>
              <Ionicons name="document-text-outline" size={18} color={C.indigo} />
              <Text style={s.sectionTitle}>Notes</Text>
            </View>
            <Text style={s.noteValue}>{appt.notes}</Text>
          </View>
        ) : null}

        {/* Status actions */}
        {!isTerminal && actions.length > 0 && (
          <View style={s.actionsRow}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a.key}
                style={s.actionCard}
                onPress={() => updateStatus(a.status, a.confirm)}
                disabled={updating}
                activeOpacity={0.7}
              >
                <View style={[s.actionIconWrap, { backgroundColor: a.bg }]}>
                  {updating ? <ActivityIndicator size="small" color={a.color} /> : <Ionicons name={a.icon} size={22} color={a.color} />}
                </View>
                <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {updating && (
          <View style={s.updatingRow}>
            <ActivityIndicator size="small" color={C.indigo} />
            <Text style={s.updatingTxt}>Updating…</Text>
          </View>
        )}

        {!isTerminal && (
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} disabled={deleting} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={C.red} />
            <Text style={s.deleteTxt}>{deleting ? 'Deleting…' : 'Delete Appointment'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Reschedule sheet */}
      <Modal visible={rescheduleOpen} transparent animationType="slide" onRequestClose={() => setRescheduleOpen(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setRescheduleOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Reschedule</Text>
            <Text style={s.sheetSub}>Pick a new date and time (12-hour, grouped by part of day)</Text>

            <ScrollView
              style={s.sheetScroll}
              contentContainerStyle={s.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <DatePickerInput
                label="Date"
                value={reschedule.date}
                onChange={(v) => {
                  setReschedule((p) => ({ ...p, date: v, start_time: '', end_time: '' }));
                  loadSlots(v);
                }}
                minDate={new Date()}
              />

              {reschedule.start_time ? (
                <View style={s.selectedSlot}>
                  <Ionicons name="time-outline" size={18} color={C.indigo} />
                  <Text style={s.selectedSlotTxt}>
                    {formatSlotRange(reschedule.start_time, reschedule.end_time)}
                  </Text>
                </View>
              ) : null}

              <Text style={s.inputLabel}>Available slots</Text>
              <AppointmentSlotPicker
                slots={slots}
                selectedStartTime={reschedule.start_time}
                loading={slotsLoading}
                showUnavailable={false}
                emptyMessage="No available slots on this date. Try another day."
                onSelect={(slot) => setReschedule((p) => ({
                  ...p,
                  start_time: slot.start_time,
                  end_time: slot.end_time || addMinutes(slot.start_time, 30),
                }))}
              />
            </ScrollView>

            <TouchableOpacity style={s.confirmBtn} onPress={handleReschedule} disabled={updating} activeOpacity={0.85}>
              {updating ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnTxt}>Confirm reschedule</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelSheetBtn} onPress={() => setRescheduleOpen(false)}>
              <Text style={s.cancelSheetTxt}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errText: { fontSize: 14, color: C.textSub },

  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  hBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hTitleBlock: { flex: 1, paddingHorizontal: 4 },
  hTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  hSub: { fontSize: 11, color: C.textSub, marginTop: 1 },

  content: { padding: 16, gap: 12 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  statusPillTxt: { fontSize: 12, fontWeight: '700' },
  pastDuePill: { backgroundColor: C.orangeLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pastDueTxt: { fontSize: 11, fontWeight: '700', color: C.orange },
  heroDate: { fontSize: 15, fontWeight: '600', color: C.textSub, marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTime: { fontSize: 22, fontWeight: '800', color: C.indigo },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6 },
  partyName: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 3 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  phoneTxt: { fontSize: 14, fontWeight: '600', color: C.indigo },
  twoCol: { flexDirection: 'row', gap: 12, marginTop: 14 },
  colHalf: { flex: 1 },
  colValue: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 3 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  noteValue: { fontSize: 14, color: C.text, lineHeight: 20 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { flex: 1, minWidth: '28%', backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  updatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  updatingTxt: { fontSize: 13, color: C.textSub },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.redLight, backgroundColor: C.surface },
  deleteTxt: { fontSize: 14, fontWeight: '700', color: C.red },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8, maxHeight: '88%' },
  sheetScroll: { maxHeight: 420 },
  sheetScrollContent: { paddingBottom: 8, gap: 4 },
  selectedSlot: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.indigoLight, borderRadius: 12, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  selectedSlotTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: C.indigo },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  sheetSub: { fontSize: 12, color: C.textSub, marginTop: 2, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, backgroundColor: C.bg },
  confirmBtn: { backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  confirmBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelSheetBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelSheetTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
});
