import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Appointment } from '../../../types';

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all',        label: 'All' },
  { id: 'scheduled',  label: 'Scheduled' },
  { id: 'completed',  label: 'Completed' },
  { id: 'cancelled',  label: 'Cancelled' },
  { id: 'no_show',    label: 'No Show' },
];

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTimeSlot(start?: string, end?: string) {
  const fmt = (t?: string) => {
    if (!t) return '';
    const [hh, mm] = t.split(':');
    const h = Number(hh);
    if (isNaN(h)) return t;
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${mm ?? '00'} ${ap}`;
  };
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

function appointmentStatusStyle(status: string) {
  switch (status) {
    case 'scheduled': return { bg: '#DBEAFE', text: '#2563EB', label: 'Scheduled', accent: '#2563EB' };
    case 'completed': return { bg: '#DCFCE7', text: '#15803D', label: 'Completed', accent: '#15803D' };
    case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled', accent: '#DC2626' };
    case 'no_show':   return { bg: '#FEF3C7', text: '#B45309', label: 'No Show',   accent: '#B45309' };
    default:          return { bg: '#F1F5F9', text: '#64748B', label: status,       accent: '#64748B' };
  }
}

function isPastDue(a: Appointment): boolean {
  if (a.status !== 'scheduled') return false;
  const dateStr = `${a.appointment_date.slice(0, 10)}T${a.end_time}`;
  const end = new Date(dateStr);
  return !isNaN(end.getTime()) && end.getTime() < Date.now();
}

function groupAppointments(items: Appointment[]) {
  const now = new Date();
  const todayStr = now.toDateString();
  const inOneWeek = new Date(now);
  inOneWeek.setDate(inOneWeek.getDate() + 7);

  const today: Appointment[] = [];
  const thisWeek: Appointment[] = [];
  const later: Appointment[] = [];
  const past: Appointment[] = [];

  for (const a of items) {
    const d = new Date(a.appointment_date);
    if (isNaN(d.getTime())) continue;
    if (d.toDateString() === todayStr) today.push(a);
    else if (d < now) past.push(a);
    else if (d <= inOneWeek) thisWeek.push(a);
    else later.push(a);
  }

  const sortAsc = (xs: Appointment[]) =>
    xs.sort((a, b) => {
      const da = new Date(`${a.appointment_date.slice(0,10)}T${a.start_time}`).getTime();
      const db = new Date(`${b.appointment_date.slice(0,10)}T${b.start_time}`).getTime();
      return da - db;
    });

  const sortDesc = (xs: Appointment[]) =>
    xs.sort((a, b) => {
      const da = new Date(`${a.appointment_date.slice(0,10)}T${a.start_time}`).getTime();
      const db = new Date(`${b.appointment_date.slice(0,10)}T${b.start_time}`).getTime();
      return db - da;
    });

  return {
    today: sortAsc(today),
    thisWeek: sortAsc(thisWeek),
    later: sortAsc(later),
    past: sortDesc(past),
  };
}

export interface AppointmentsTabProps {
  loading: boolean;
  appointments: Appointment[];
  onBook: () => void;
  onOpen: (id: string) => void;
}

export function AppointmentsTab({ loading, appointments, onBook, onOpen }: AppointmentsTabProps) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(
    () => statusFilter === 'all'
      ? appointments
      : appointments.filter((a) => a.status === statusFilter),
    [appointments, statusFilter],
  );

  const groups = useMemo(() => groupAppointments(filtered), [filtered]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#4361EE" />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {/* Top action row */}
      <View style={styles.topRow}>
        <View style={styles.totalPill}>
          <Ionicons name="calendar" size={14} color="#4361EE" />
          <Text style={styles.totalPillTxt}>{filtered.length} {filtered.length === 1 ? 'appointment' : 'appointments'}</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={onBook} activeOpacity={0.85}>
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.bookBtnTxt}>Book</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setStatusFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillTxt, active && styles.filterPillTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-clear" size={28} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No appointments</Text>
          <Text style={styles.emptySub}>
            {statusFilter === 'all'
              ? 'Book the first appointment for this patient.'
              : `No ${STATUS_FILTERS.find((s) => s.id === statusFilter)?.label.toLowerCase()} appointments.`}
          </Text>
          {statusFilter === 'all' && (
            <TouchableOpacity style={styles.emptyBtn} onPress={onBook}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={styles.emptyBtnTxt}>Book Appointment</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <Group title="Today"     items={groups.today}    onOpen={onOpen} />
          <Group title="This Week" items={groups.thisWeek} onOpen={onOpen} />
          <Group title="Upcoming"  items={groups.later}    onOpen={onOpen} />
          <Group title="Past"      items={groups.past}     onOpen={onOpen} muted />
        </>
      )}
    </View>
  );
}

function Group({
  title, items, onOpen, muted,
}: {
  title: string;
  items: Appointment[];
  onOpen: (id: string) => void;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <View>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.groupCount}>
          <Text style={styles.groupCountTxt}>{items.length}</Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {items.map((a) => (
          <ApptCard key={a.id} appt={a} onOpen={onOpen} muted={muted} />
        ))}
      </View>
    </View>
  );
}

function ApptCard({ appt, onOpen, muted }: { appt: Appointment; onOpen: (id: string) => void; muted?: boolean }) {
  const st = appointmentStatusStyle(appt.status);
  const pastDue = isPastDue(appt);
  const d = new Date(appt.appointment_date);
  const day = d.getDate();
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];

  return (
    <TouchableOpacity
      style={[styles.card, muted && { opacity: 0.78 }]}
      activeOpacity={0.8}
      onPress={() => onOpen(appt.id)}
    >
      <View style={[styles.accent, { backgroundColor: st.accent }]} />

      <View style={styles.dateTile}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {appt.notes || 'Appointment'}
          </Text>
          {pastDue && (
            <View style={styles.pastDue}>
              <Text style={styles.pastDueTxt}>Past Due</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={12} color="#64748b" />
          <Text style={styles.metaTxt}>{formatTimeSlot(appt.start_time, appt.end_time)}</Text>
        </View>
        {appt.dentist?.name && (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={12} color="#64748b" />
            <Text style={styles.metaTxt} numberOfLines={1}>{appt.dentist.name}</Text>
          </View>
        )}
        {appt.branch?.name && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.metaTxt} numberOfLines={1}>{appt.branch.name}</Text>
          </View>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusPillTxt, { color: st.text }]}>{st.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  totalPillTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#4361EE',
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  bookBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  filterStrip: { gap: 6, paddingVertical: 2 },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: { backgroundColor: '#EEF2FF' },
  filterPillTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterPillTxtActive: { color: '#4361EE', fontWeight: '700' },

  // Group
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCount: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  groupCountTxt: { fontSize: 11, fontWeight: '700', color: '#475569' },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    position: 'relative', overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },

  dateTile: {
    width: 50, height: 50, borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 18, fontWeight: '800', color: '#4361EE', lineHeight: 20 },
  dateMonth: { fontSize: 9, fontWeight: '700', color: '#4361EE', letterSpacing: 0.5 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pastDue: {
    backgroundColor: '#FED7AA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  pastDueTxt: { fontSize: 10, fontWeight: '700', color: '#9A3412' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontSize: 11, color: '#64748b' },

  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillTxt: { fontSize: 10, fontWeight: '700' },

  // Empty
  empty: {
    paddingVertical: 30, alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#4361EE', marginTop: 4,
  },
  emptyBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
