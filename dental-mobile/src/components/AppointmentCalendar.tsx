import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  buildMonthGrid,
  toDateStr,
  WEEKDAY_LABELS,
} from '../utils/appointmentCalendar';

const C = {
  indigo: '#4361EE',
  indigoLight: '#EEF2FF',
  bg: '#F8FAFC',
  surface: '#ffffff',
  text: '#0f172a',
  textMuted: '#94a3b8',
  border: '#E2E8F0',
};

type Props = {
  month: Date;
  selectedDate: string;
  countsByDate: Record<string, number>;
  onMonthChange: (next: Date) => void;
  onSelectDate: (dateStr: string) => void;
};

export default function AppointmentCalendar({
  month,
  selectedDate,
  countsByDate,
  onMonthChange,
  onSelectDate,
}: Props) {
  const today = toDateStr(new Date());
  const grid = buildMonthGrid(month);
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={s.wrap}>
      <View style={s.navRow}>
        <TouchableOpacity
          style={s.navBtn}
          onPress={() => onMonthChange(addMonths(month, -1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          style={s.navBtn}
          onPress={() => onMonthChange(addMonths(month, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {WEEKDAY_LABELS.map((d) => (
          <Text key={d} style={s.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={s.grid}>
        {grid.map((cell, i) => {
          if (!cell) {
            return <View key={`pad-${i}`} style={s.cell} />;
          }
          const ds = toDateStr(cell.date);
          const count = countsByDate[ds] ?? 0;
          const isSelected = ds === selectedDate;
          const isToday = ds === today;
          return (
            <TouchableOpacity
              key={ds}
              style={s.cell}
              onPress={() => onSelectDate(ds)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  s.dayInner,
                  isSelected && s.daySelected,
                  !isSelected && isToday && s.dayToday,
                ]}
              >
                <Text
                  style={[
                    s.dayNum,
                    isSelected && s.dayNumSelected,
                    !cell.inMonth && s.dayNumMuted,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
                {count > 0 && (
                  <View style={[s.eventDot, isSelected && s.eventDotSelected]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 16, fontWeight: '800', color: C.text },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: {
    width: 36,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  daySelected: { backgroundColor: C.indigo },
  dayToday: { backgroundColor: C.indigoLight },
  dayNum: { fontSize: 13, fontWeight: '600', color: C.text, lineHeight: 16 },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  dayNumMuted: { color: C.textMuted },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.indigo,
  },
  eventDotSelected: { backgroundColor: '#fff' },
});
