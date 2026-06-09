import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supportService, type SupportTicketDetail } from '../../services/support.service';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList, 'SupportTicketDetail'>;
type Route = RouteProp<BillingStackParamList, 'SupportTicketDetail'>;

export default function SupportTicketDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { ticketId } = route.params;

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await supportService.getOne(ticketId);
      setTicket(data);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handleSend = async () => {
    const msg = reply.trim();
    if (!msg) return;
    setSending(true);
    try {
      await supportService.addComment(ticketId, msg);
      setReply('');
      await load();
    } finally {
      setSending(false);
    }
  };

  if (loading || !ticket) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, justifyContent: 'center' }]}>
        <ActivityIndicator color="#4361EE" />
      </View>
    );
  }

  const thread = [
    { id: 'initial', author_type: 'user' as const, author_name: 'You', message: ticket.message, created_at: ticket.created_at },
    ...ticket.comments,
  ];

  return (
    <KeyboardAvoidingView
      style={[s.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{ticket.subject}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.thread} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {thread.map((c) => {
          const isAdmin = c.author_type === 'admin';
          return (
            <View key={c.id} style={[s.bubble, isAdmin ? s.bubbleAdmin : s.bubbleUser]}>
              <Text style={s.author}>{isAdmin ? 'Support team' : c.author_name}</Text>
              <Text style={s.body}>{c.message}</Text>
              <Text style={s.time}>{new Date(c.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={s.input}
          placeholder="Write a reply..."
          value={reply}
          onChangeText={setReply}
          multiline
        />
        <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={sending || !reply.trim()}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  thread: { flex: 1 },
  bubble: { borderRadius: 12, padding: 12, maxWidth: '92%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#EEF2FF' },
  bubbleAdmin: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  author: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  body: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  time: { fontSize: 10, color: '#94a3b8', marginTop: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#F8FAFC' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4361EE', alignItems: 'center', justifyContent: 'center' },
});
