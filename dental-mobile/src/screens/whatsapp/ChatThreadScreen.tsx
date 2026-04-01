import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { whatsappService, WaMessage, WaTemplate } from '../../services/whatsapp.service';
import { colors, spacing, typography, radius } from '../../theme';
import type { WhatsAppStackParamList } from '../../types';

type RouteParams = RouteProp<WhatsAppStackParamList, 'ChatThread'>;

const WA_GREEN = '#25D366';
const WA_DARK = '#075E54';
const WA_BG = '#e5ddd5';
const BUBBLE_OUT = '#dcf8c6';
const BUBBLE_IN = '#ffffff';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function StatusTick({ status }: { status: string }) {
  if (status === 'read') return <Text style={styles.tickBlue}>✓✓</Text>;
  if (status === 'delivered') return <Text style={styles.tickGrey}>✓✓</Text>;
  if (status === 'sent') return <Text style={styles.tickGrey}>✓</Text>;
  if (status === 'failed') return <Text style={styles.tickRed}>!</Text>;
  return <Text style={styles.tickGrey}>⏳</Text>;
}

export default function ChatThreadScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { phone, name, patientId } = route.params;

  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WaTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const res = await whatsappService.getMessages(phone);
      setMessages(res.data ?? []);

      // Check if session is open (last inbound within 24hrs)
      const lastInbound = (res.data ?? [])
        .filter((m) => m.direction === 'inbound')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      if (lastInbound) {
        setSessionOpen(Date.now() - new Date(lastInbound.created_at).getTime() < 24 * 60 * 60 * 1000);
      } else {
        setSessionOpen(false);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }, [loadMessages]),
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    if (!sessionOpen) {
      Alert.alert(
        'Session Expired',
        'The 24-hour session window has expired. Tap "Send Template" to re-engage the patient.',
      );
      return;
    }
    setSending(true);
    try {
      await whatsappService.reply(phone, replyText.trim());
      setReplyText('');
      await loadMessages();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Template picker helpers
  const openTemplatePicker = async () => {
    setShowTemplatePicker(true);
    setSelectedTemplate(null);
    setTemplateVars({});
    setTemplatesLoading(true);
    try {
      const res = await whatsappService.getTemplates();
      setTemplates(
        (res.data ?? []).filter(
          (t) => t.whatsapp_template_status === 'approved' && t.is_active,
        ),
      );
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const parsedTemplateVars = useMemo(() => {
    if (!selectedTemplate) return [];
    if (selectedTemplate.variables && selectedTemplate.variables.length > 0) {
      return selectedTemplate.variables;
    }
    const matches = selectedTemplate.body.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))].sort(
      (a, b) => Number(a) - Number(b),
    );
  }, [selectedTemplate]);

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !patientId || sendingTemplate) return;
    setSendingTemplate(true);
    try {
      await whatsappService.startConversation({
        patient_id: patientId,
        template_id: selectedTemplate.id,
        variables: Object.keys(templateVars).length > 0 ? templateVars : undefined,
      });
      setShowTemplatePicker(false);
      setSelectedTemplate(null);
      Alert.alert('Success', 'Template sent successfully');
      await loadMessages();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send template');
    } finally {
      setSendingTemplate(false);
    }
  };

  // Group messages with date separators
  const renderItem = ({ item, index }: { item: WaMessage; index: number }) => {
    const prev = index > 0 ? messages[index - 1] : null;
    const showDate =
      !prev ||
      new Date(item.created_at).toDateString() !== new Date(prev.created_at).toDateString();
    const isOut = item.direction === 'outbound';

    return (
      <View>
        {showDate && (
          <View style={styles.dateSepWrap}>
            <View style={styles.dateSep}>
              <Text style={styles.dateSepText}>{formatDateHeader(item.created_at)}</Text>
            </View>
          </View>
        )}
        <View style={[styles.bubbleRow, isOut ? styles.bubbleRowOut : styles.bubbleRowIn]}>
          <View style={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
            {item.template && (
              <Text style={styles.templateBadge}>via {item.template.template_name}</Text>
            )}
            <Text style={styles.bubbleBody}>{item.body}</Text>
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>{formatMsgTime(item.created_at)}</Text>
              {isOut && <StatusTick status={item.status} />}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{getInitials(name)}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
            <Text style={styles.headerPhone}>{phone}</Text>
          </View>
        </View>

        {/* Session warning */}
        {!loading && !sessionOpen && (
          <View style={styles.sessionWarning}>
            <Text style={styles.sessionWarningText}>
              ⚠️ 24-hour session expired. Send a template to re-engage.
            </Text>
            {patientId && (
              <TouchableOpacity
                style={styles.sendTemplateBtn}
                onPress={openTemplatePicker}
                activeOpacity={0.8}
              >
                <Text style={styles.sendTemplateBtnText}>Send Template</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Messages */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={WA_GREEN} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={[
              styles.messageContent,
              messages.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' },
            ]}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet</Text>
              </View>
            }
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
          />
        )}

        {/* Reply bar */}
        <View style={styles.replyBar}>
          <TextInput
            style={[styles.replyInput, !sessionOpen && styles.replyInputDisabled]}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={sessionOpen ? 'Type a message...' : 'Session expired'}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4096}
            editable={sessionOpen}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!replyText.trim() || sending || !sessionOpen) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!replyText.trim() || sending || !sessionOpen}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>↗</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Template Picker Modal */}
      <Modal visible={showTemplatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTemplate ? 'Fill Variables' : 'Select Template'}
              </Text>
              <TouchableOpacity onPress={() => { setShowTemplatePicker(false); setSelectedTemplate(null); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedTemplate ? (
              templatesLoading ? (
                <View style={styles.modalCentered}>
                  <ActivityIndicator size="large" color={WA_GREEN} />
                </View>
              ) : templates.length === 0 ? (
                <View style={styles.modalCentered}>
                  <Text style={{ color: colors.textMuted, fontSize: typography.sm }}>
                    No approved templates found.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={templates}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalTemplateItem}
                      activeOpacity={0.7}
                      onPress={() => { setSelectedTemplate(item); setTemplateVars({}); }}
                    >
                      <Text style={styles.modalTemplateName}>{item.template_name}</Text>
                      <Text style={styles.modalTemplateBody} numberOfLines={2}>{item.body}</Text>
                    </TouchableOpacity>
                  )}
                />
              )
            ) : (
              <ScrollView contentContainerStyle={{ padding: spacing.base }}>
                <View style={styles.modalPreview}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                    <Text style={styles.modalTemplateName}>{selectedTemplate.template_name}</Text>
                    <TouchableOpacity onPress={() => setSelectedTemplate(null)}>
                      <Text style={{ color: WA_DARK, fontSize: typography.sm, fontWeight: '600' }}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalTemplateBody}>{selectedTemplate.body}</Text>
                </View>

                {parsedTemplateVars.length > 0 && (
                  <View style={{ marginTop: spacing.base }}>
                    <Text style={{ fontSize: typography.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm }}>
                      Template Variables
                    </Text>
                    {parsedTemplateVars.map((varKey) => (
                      <View key={varKey} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                        <Text style={{ fontSize: typography.xs, color: colors.textMuted, width: 50 }}>{`{{${varKey}}}`}</Text>
                        <TextInput
                          style={styles.modalVarInput}
                          placeholder={`Value for {{${varKey}}}`}
                          placeholderTextColor={colors.textMuted}
                          value={templateVars[varKey] || ''}
                          onChangeText={(text) => setTemplateVars((prev) => ({ ...prev, [varKey]: text }))}
                        />
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalSendBtn, sendingTemplate && { opacity: 0.5 }]}
                  onPress={handleSendTemplate}
                  disabled={sendingTemplate}
                  activeOpacity={0.8}
                >
                  {sendingTemplate ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSendBtnText}>Send Template</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WA_BG },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    backgroundColor: WA_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 30,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: typography.sm,
    fontWeight: '700',
  },
  headerInfo: { flex: 1 },
  headerName: {
    color: '#fff',
    fontSize: typography.base,
    fontWeight: '600',
  },
  headerPhone: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.xs,
  },

  // Session warning
  sessionWarning: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  sessionWarningText: {
    fontSize: typography.xs,
    color: '#92400e',
    lineHeight: 16,
  },

  // Messages
  messageList: { flex: 1, backgroundColor: WA_BG },
  messageContent: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },

  dateSepWrap: { alignItems: 'center', marginVertical: spacing.md },
  dateSep: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  dateSepText: { fontSize: typography.xs, color: colors.textSecondary },

  bubbleRow: { marginBottom: 2 },
  bubbleRowOut: { alignItems: 'flex-end' },
  bubbleRowIn: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  bubbleOut: {
    backgroundColor: BUBBLE_OUT,
    borderTopRightRadius: 0,
  },
  bubbleIn: {
    backgroundColor: BUBBLE_IN,
    borderTopLeftRadius: 0,
  },
  templateBadge: {
    fontSize: 10,
    color: WA_DARK,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 2,
  },
  bubbleBody: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  bubbleTime: { fontSize: 10, color: colors.textMuted },
  tickBlue: { fontSize: 10, color: '#53bdeb' },
  tickGrey: { fontSize: 10, color: colors.textMuted },
  tickRed: { fontSize: 10, color: colors.danger, fontWeight: '700' },

  emptyChat: { alignItems: 'center', justifyContent: 'center' },
  emptyChatText: { fontSize: typography.sm, color: colors.textMuted },

  // Reply bar
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f0f2f5',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    maxHeight: 100,
    minHeight: 42,
  },
  replyInputDisabled: {
    backgroundColor: '#e5e7eb',
    color: colors.textMuted,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WA_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  // Send Template button in session warning
  sendTemplateBtn: {
    backgroundColor: WA_GREEN,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  sendTemplateBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },

  // Template picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.md, fontWeight: '600', color: colors.text },
  modalClose: { fontSize: 18, color: colors.textMuted, padding: spacing.sm },
  modalCentered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalTemplateItem: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTemplateName: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  modalTemplateBody: { fontSize: typography.xs, color: colors.textSecondary, lineHeight: 16, marginTop: 4 },
  modalPreview: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.base },
  modalVarInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSendBtn: {
    backgroundColor: WA_GREEN,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalSendBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
