import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AvailableSlot } from '../types';
import {
  groupSlotsByPeriod,
  formatTime12h,
  PERIOD_META,
} from '../utils/appointmentSlots';

const C = {
  indigo: '#4361EE',
  indigoLight: '#EEF2FF',
  bg: '#F8FAFC',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#475569',
  textMuted: '#94a3b8',
  border: '#E2E8F0',
  divider: '#EEF2F6',
};

interface Props {
  slots: AvailableSlot[];
  selectedStartTime: string;
  onSelect: (slot: AvailableSlot) => void;
  loading?: boolean;
  emptyMessage?: string;
  /** When false, booked slots are hidden (reschedule). Default true for booking. */
  showUnavailable?: boolean;
}

export default function AppointmentSlotPicker({
  slots,
  selectedStartTime,
  onSelect,
  loading = false,
  emptyMessage = 'No slots available for this date',
  showUnavailable = true,
}: Props) {
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.indigo} />
        <Text style={s.loadingTxt}>Loading available slots…</Text>
      </View>
    );
  }

  const visible = showUnavailable ? slots : slots.filter((x) => x.available);
  const grouped = groupSlotsByPeriod(visible);

  if (grouped.length === 0) {
    return (
      <View style={s.emptyBox}>
        <Ionicons name="calendar-outline" size={28} color={C.textMuted} />
        <Text style={s.emptyTxt}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      {grouped.map(({ period, slots: periodSlots }) => {
        const meta = PERIOD_META[period];
        return (
          <View key={period} style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionIcon}>
                <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={16} color={C.indigo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>{meta.label}</Text>
                <Text style={s.sectionRange}>{meta.range}</Text>
              </View>
            </View>
            <View style={s.grid}>
              {periodSlots.map((slot) => {
                const active = selectedStartTime === slot.start_time;
                const disabled = !slot.available;
                return (
                  <TouchableOpacity
                    key={slot.start_time}
                    style={[
                      s.slotBtn,
                      active && s.slotBtnOn,
                      disabled && s.slotBtnOff,
                    ]}
                    onPress={() => slot.available && onSelect(slot)}
                    disabled={disabled}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.slotTxt, active && s.slotTxtOn, disabled && s.slotTxtOff]}>
                      {formatTime12h(slot.start_time)}
                    </Text>
                    {disabled && <Text style={s.bookedLbl}>Booked</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 16 },
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingTxt: { fontSize: 13, color: C.textSub },
  emptyBox: {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 8,
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  emptyTxt: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  section: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: C.indigoLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  sectionRange: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    minWidth: '30%',
    flexGrow: 1,
    maxWidth: '32%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  slotBtnOn: { borderColor: C.indigo, backgroundColor: C.indigoLight },
  slotBtnOff: { opacity: 0.45, backgroundColor: C.bg },
  slotTxt: { fontSize: 13, fontWeight: '700', color: C.textSub },
  slotTxtOn: { color: C.indigo },
  slotTxtOff: { color: C.textMuted },
  bookedLbl: { fontSize: 9, fontWeight: '700', color: '#dc2626', marginTop: 2 },
});
