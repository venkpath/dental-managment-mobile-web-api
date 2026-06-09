import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { demoService, type DemoSlot } from '../services/demo.service';
import { useDemoStore } from '../store/demo.store';

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DemoRequestModal() {
  const { showModal, closeDemoModal } = useDemoStore();
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [slots, setSlots] = useState<DemoSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    setLoading(true);
    setSelectedSlot(null);
    demoService
      .getAvailableSlots(date)
      .then((res) => setSlots(res.slots))
      .catch(() => Alert.alert('Error', 'Could not load demo slots. Try again later.'))
      .finally(() => setLoading(false));
  }, [showModal, date]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    const next = formatDateInput(d);
    if (next >= formatDateInput(new Date())) setDate(next);
  };

  const handleSubmit = async () => {
    if (!selectedSlot) {
      Alert.alert('Pick a time', 'Please choose a demo time slot.');
      return;
    }
    setSubmitting(true);
    try {
      await demoService.submitFromApp(date, selectedSlot);
      Alert.alert(
        'Demo requested',
        'Thanks! Our team will confirm your demo shortly. Your details were sent automatically.',
      );
      closeDemoModal();
    } catch (err: unknown) {
      Alert.alert('Could not book', err instanceof Error ? err.message : 'Please try another slot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeDemoModal}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <View>
              <Text style={s.title}>Request a free demo</Text>
              <Text style={s.sub}>Walk through Smart Dental Desk with our team</Text>
            </View>
            <TouchableOpacity onPress={closeDemoModal} hitSlop={12}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>Your name, clinic, phone and email are sent automatically.</Text>

          <View style={s.dateRow}>
            <TouchableOpacity onPress={() => shiftDate(-1)} style={s.dateBtn}>
              <Ionicons name="chevron-back" size={20} color="#4361EE" />
            </TouchableOpacity>
            <Text style={s.dateLabel}>{date}</Text>
            <TouchableOpacity onPress={() => shiftDate(1)} style={s.dateBtn}>
              <Ionicons name="chevron-forward" size={20} color="#4361EE" />
            </TouchableOpacity>
          </View>
          <Text style={s.window}>10 AM – 10 PM · Lunch 2:00–2:30 unavailable</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color="#4361EE" />
          ) : (
            <ScrollView style={s.slotList} contentContainerStyle={s.slotGrid}>
              {slots.map((slot) => {
                const selected = selectedSlot === slot.slot;
                const disabled = !slot.available;
                return (
                  <TouchableOpacity
                    key={slot.slot}
                    disabled={disabled}
                    onPress={() => setSelectedSlot(slot.slot)}
                    style={[
                      s.slotChip,
                      selected && s.slotChipSelected,
                      disabled && s.slotChipDisabled,
                    ]}
                  >
                    <Text style={[s.slotText, selected && s.slotTextSelected, disabled && s.slotTextDisabled]}>
                      {slot.label}
                    </Text>
                    {slot.reason === 'booked' && <Text style={s.slotBadge}>Full</Text>}
                    {slot.reason === 'lunch' && <Text style={s.slotBadge}>Break</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[s.submitBtn, (!selectedSlot || submitting) && s.submitBtnDisabled]}
            disabled={!selectedSlot || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitText}>Request demo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={closeDemoModal} style={s.skipBtn}>
            <Text style={s.skipText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  hint: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 4 },
  dateBtn: { padding: 8 },
  dateLabel: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  window: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginBottom: 12 },
  slotList: { maxHeight: 220 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    minWidth: '30%',
    alignItems: 'center',
  },
  slotChipSelected: { backgroundColor: '#EEF2FF', borderColor: '#4361EE' },
  slotChipDisabled: { opacity: 0.45 },
  slotText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  slotTextSelected: { color: '#4361EE' },
  slotTextDisabled: { color: '#94a3b8' },
  slotBadge: { fontSize: 9, color: '#94a3b8', marginTop: 2 },
  submitBtn: {
    backgroundColor: '#4361EE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: '#64748b', fontSize: 13 },
});
