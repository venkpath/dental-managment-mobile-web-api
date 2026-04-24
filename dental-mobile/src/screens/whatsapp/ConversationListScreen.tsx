import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { whatsappService, WaConversation } from '../../services/whatsapp.service';
import { colors, spacing, typography, radius } from '../../theme';
import { getLocale } from '../../utils/format';
import type { WhatsAppStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<WhatsAppStackParamList>;

const WA_GREEN = '#25D366';
const WA_DARK = '#075E54';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return d.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString(getLocale(), { weekday: 'short' });
  return d.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
}

export default function ConversationListScreen() {
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      // Check settings first
      const settings = await whatsappService.getSettings();
      const cfg = settings.whatsapp_config as Record<string, string> | undefined;
      const connected = !!(cfg?.connectionMethod === 'embedded_signup' && cfg?.phoneNumberId);
      setIsConnected(connected);

      if (connected) {
        const res = await whatsappService.getConversations();
        setConversations(res.data ?? []);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      // Poll every 15s
      const interval = setInterval(() => {
        if (isConnected) {
          whatsappService
            .getConversations()
            .then((res) => setConversations(res.data ?? []))
            .catch(() => {});
        }
      }, 15000);
      return () => clearInterval(interval);
    }, [load, isConnected]),
  );

  const filtered = conversations.filter((c) =>
    search
      ? c.patient_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
      : true,
  );

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={WA_GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  // Not configured
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>WhatsApp Inbox</Text>
        </View>
        <View style={styles.notConfigured}>
          <View style={styles.notConfiguredIcon}>
            <Text style={{ fontSize: 48 }}>💬</Text>
          </View>
          <Text style={styles.notConfiguredTitle}>WhatsApp Not Configured</Text>
          <Text style={styles.notConfiguredDesc}>
            Connect your clinic's WhatsApp Business number from the web dashboard
            (Communication → Settings) to start sending and receiving messages.
          </Text>
          <View style={styles.featureList}>
            {[
              'Receive patient replies in real-time',
              'Send appointment reminders',
              'Your clinic number — patients recognise you',
              'Enterprise plan with own WABA required',
            ].map((text) => (
              <View key={text} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: WaConversation }) => (
    <TouchableOpacity
      style={styles.convItem}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('ChatThread', {
          phone: item.phone,
          name: item.patient_name,
          patientId: item.patient_id,
        })
      }
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.patient_name)}</Text>
      </View>

      <View style={styles.convInfo}>
        {/* Name + time */}
        <View style={styles.convTopRow}>
          <Text style={styles.convName} numberOfLines={1}>
            {item.patient_name}
          </Text>
          <Text
            style={[
              styles.convTime,
              item.unread_count > 0 && { color: WA_GREEN, fontWeight: '700' },
            ]}
          >
            {formatTime(item.last_at)}
          </Text>
        </View>

        {/* Message + badge */}
        <View style={styles.convBottomRow}>
          <Text style={styles.convPreview} numberOfLines={1}>
            {item.last_direction === 'outbound' ? '↗ ' : ''}
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* WhatsApp-style header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>WhatsApp Inbox</Text>
          {totalUnread > 0 && (
            <Text style={styles.headerSub}>
              {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Conversation list */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.phone}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 40, opacity: 0.3 }}>💬</Text>
            <Text style={styles.emptyText}>
              {search
                ? 'No conversations match.'
                : 'No conversations yet.\nConversations appear here when patients reply to your messages.'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={WA_GREEN}
            colors={[WA_GREEN]}
          />
        }
      />

      {/* New Conversation FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('NewConversation')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    backgroundColor: WA_DARK,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    paddingTop: spacing.sm,
  },
  headerTitle: {
    color: '#fff',
    fontSize: typography.xl,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.xs,
    marginTop: 2,
  },

  searchWrap: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sm,
    color: colors.text,
  },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DFE5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: '#6B7C85',
  },
  convInfo: { flex: 1, gap: 4 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  convTime: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  convBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convPreview: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: WA_GREEN,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  emptyContainer: { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Not configured
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
  },
  notConfiguredIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConfiguredTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
  },
  notConfiguredDesc: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: { gap: spacing.sm, alignSelf: 'stretch', paddingHorizontal: spacing.base },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureCheck: { color: WA_GREEN, fontSize: typography.base, fontWeight: '700' },
  featureText: { fontSize: typography.sm, color: colors.textSecondary },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WA_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '600', lineHeight: 30 },
});
