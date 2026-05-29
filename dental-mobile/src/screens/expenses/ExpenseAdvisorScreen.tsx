import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { aiService, type ExpenseAdvisorChatMessage } from '../../services/ai.service';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useAuthStore } from '../../store/auth.store';
import ChatMarkdown from '../../components/ChatMarkdown';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
  bubbleUser: '#4361EE',
  bubbleAi: '#ffffff',
};

const STARTER_PROMPTS = [
  'How much did we spend this month?',
  'Which category is our biggest cost?',
  'Compare spending to last month',
  'Any tips to reduce clinic expenses?',
];

let msgId = 0;
function nextId() {
  return `m-${++msgId}`;
}

export default function ExpenseAdvisorScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const branchId = useAuthStore((s) => s.branchId);

  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, sending]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 500) {
      Alert.alert('Too long', 'Please keep your message under 500 characters.');
      return;
    }

    const userMsg: ChatItem = { id: nextId(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);
    setSending(true);

    try {
      const prior: ExpenseAdvisorChatMessage[] = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await aiService.expenseAdvisorChat({
        message: trimmed,
        history: prior.length > 0 ? prior : undefined,
        branch_id: branchId ?? undefined,
      });
      const reply = res.response?.trim() || 'I could not generate a response. Please try again.';
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: reply }]);
      setSuggestions(res.suggestions?.filter(Boolean) ?? []);
    } catch (err) {
      Alert.alert('Spendly', err instanceof Error ? err.message : 'Failed to get a response');
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatItem }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <View style={s.avatar}>
            <Ionicons name="sparkles" size={14} color={C.violet} />
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAi]}>
          {isUser ? (
            <Text style={[s.bubbleText, s.bubbleTextUser]}>{item.content}</Text>
          ) : (
            <ChatMarkdown content={item.content} inverted={false} />
          )}
        </View>
      </View>
    );
  };

  const showStarters = messages.length === 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={[s.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerIcon}>
            <Ionicons name="sparkles" size={18} color={C.violet} />
          </View>
          <View>
            <Text style={s.headerTitle}>Spendly</Text>
            <Text style={s.headerSub}>Expense advisor</Text>
          </View>
        </View>
        <View style={s.hBtnPlaceholder} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={s.list}
        contentContainerStyle={[
          s.listContent,
          showStarters && { flexGrow: 1 },
          { paddingBottom: 8 },
        ]}
        ListHeaderComponent={
          showStarters ? (
            <View style={s.welcome}>
              <Text style={s.welcomeTitle}>Ask about your clinic spending</Text>
              <Text style={s.welcomeSub}>
                Answers are grounded in your recorded expenses and revenue — not generic advice.
              </Text>
              <View style={s.starters}>
                {STARTER_PROMPTS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={s.starterChip}
                    onPress={() => sendMessage(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.starterTxt}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          sending ? (
            <View style={s.typingRow}>
              <View style={s.avatar}>
                <Ionicons name="sparkles" size={14} color={C.violet} />
              </View>
              <View style={[s.bubble, s.bubbleAi, s.typingBubble]}>
                <ActivityIndicator size="small" color={C.violet} />
                <Text style={s.typingTxt}>Analyzing expenses…</Text>
              </View>
            </View>
          ) : null
        }
      />

      {suggestions.length > 0 && !sending && (
        <View style={s.suggestRow}>
          {suggestions.map((sug) => (
            <TouchableOpacity
              key={sug}
              style={s.suggestChip}
              onPress={() => sendMessage(sug)}
              activeOpacity={0.7}
            >
              <Text style={s.suggestTxt} numberOfLines={2}>{sug}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[s.composer, { paddingBottom: Math.max(10, bottomInset) }]}>
        <TextInput
          style={s.input}
          placeholder="Ask Spendly…"
          placeholderTextColor={C.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  hBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  hBtnPlaceholder: { width: 40 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.violetLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 11, color: C.textMuted },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 12 },
  welcome: { paddingVertical: 16, gap: 10 },
  welcomeTitle: { fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  welcomeSub: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  starters: { gap: 8, marginTop: 8 },
  starterChip: { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  starterTxt: { fontSize: 13, fontWeight: '600', color: C.indigo },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.violetLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bubble: { flexShrink: 1, maxWidth: '88%', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleUser: { backgroundColor: C.bubbleUser, borderBottomRightRadius: 4, maxWidth: '82%' },
  bubbleAi: { backgroundColor: C.bubbleAi, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.text },
  bubbleTextUser: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingTxt: { fontSize: 12, color: C.textMuted },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  suggestChip: { backgroundColor: C.violetLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%', borderWidth: 1, borderColor: '#ddd6fe' },
  suggestTxt: { fontSize: 12, fontWeight: '600', color: C.violet },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  input: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.45 },
});
