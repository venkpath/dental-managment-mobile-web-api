import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supportService, type TicketCategory } from '../../services/support.service';
import type { BillingStackParamList } from '../../types';

const CATEGORIES: { key: TicketCategory; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'bug', label: 'Bug' },
  { key: 'feature_request', label: 'Feature' },
  { key: 'billing', label: 'Billing' },
  { key: 'account', label: 'Account' },
];

type Nav = NativeStackNavigationProp<BillingStackParamList, 'NewSupportTicket'>;

export default function NewSupportTicketScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<TicketCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Please enter a subject and message.');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await supportService.create({ category, subject: subject.trim(), message: message.trim() });
      navigation.replace('SupportTicketDetail', { ticketId: ticket.id });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.title}>New support ticket</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.form}>
        <Text style={s.label}>Category</Text>
        <View style={s.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[s.chip, category === c.key && s.chipActive]}
            >
              <Text style={[s.chipText, category === c.key && s.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Subject</Text>
        <TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="Brief summary" />

        <Text style={s.label}>Message</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Describe your issue..."
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Submit ticket</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  form: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#EEF2FF', borderColor: '#4361EE' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#4361EE' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea: { minHeight: 120 },
  submitBtn: { backgroundColor: '#4361EE', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#fff', fontWeight: '700' },
});
