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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { whatsappService, WaConversation } from '../../services/whatsapp.service';
import { getLocale } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import { useDrawer } from '../../components/DrawerMenu';
import { useBottomInset } from '../../hooks/useBottomInset';
import { shadow } from '../../theme';
import type { WhatsAppStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<WhatsAppStackParamList>;

const C = {
  indigo: '#4361EE',
  indigoLight: '#EEF2FF',
  wa: '#25D366',
  waLight: '#DCFCE7',
  bg: '#F8FAFC',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#475569',
  textMuted: '#94a3b8',
  border: '#E2E8F0',
};

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
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
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

  const renderItem = ({ item }: { item: WaConversation }) => (
    <TouchableOpacity
      style={s.convItem}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('ChatThread', {
          phone: item.phone,
          name: item.patient_name,
          patientId: item.patient_id,
        })
      }
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{getInitials(item.patient_name)}</Text>
      </View>

      <View style={s.convInfo}>
        <View style={s.convTopRow}>
          <Text style={s.convName} numberOfLines={1}>
            {item.patient_name}
          </Text>
          <Text
            style={[
              s.convTime,
              item.unread_count > 0 && { color: C.wa, fontWeight: '700' },
            ]}
          >
            {formatTime(item.last_at)}
          </Text>
        </View>

        <View style={s.convBottomRow}>
          <Text style={s.convPreview} numberOfLines={1}>
            {item.last_direction === 'outbound' ? '↗ ' : ''}
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.indigo} />
        </View>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={s.titleBlock}>
            <Text style={s.title}>Inbox</Text>
            <Text style={s.subtitle}>WhatsApp conversations</Text>
          </View>
        </View>
        <View style={s.notConfigured}>
          <View style={s.notConfiguredIcon}>
            <Ionicons name="logo-whatsapp" size={40} color={C.wa} />
          </View>
          <Text style={s.notConfiguredTitle}>WhatsApp not connected</Text>
          <Text style={s.notConfiguredDesc}>
            Connect your clinic WhatsApp Business number from the web dashboard
            (Communication → Settings) to send and receive patient messages here.
          </Text>
          {[
            'Receive patient replies in real time',
            'Send appointment reminders',
            'Your clinic number — patients recognise you',
          ].map((text) => (
            <View key={text} style={s.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={C.wa} />
              <Text style={s.featureText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Inbox</Text>
          <Text style={s.subtitle}>
            {totalUnread > 0
              ? `${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`
              : 'WhatsApp conversations'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => navigation.navigate('NewConversation')}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or phone"
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.phone}
        contentContainerStyle={[
          filtered.length === 0 ? s.emptyContainer : s.listPad,
          { paddingBottom: 88 + bottomInset },
        ]}
        ListEmptyComponent={
          <EmptyState
            title={search ? 'No matches' : 'No conversations yet'}
            subtitle={
              search
                ? 'Try a different name or phone number'
                : 'Conversations appear when patients reply to your clinic messages.'
            }
            icon="chatbubbles-outline"
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={C.indigo}
            colors={[C.indigo]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[s.fab, { bottom: 16 + bottomInset }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('NewConversation')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: C.bg,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.wa,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },

  listPad: { paddingTop: 4 },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
    ...shadow.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.waLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: C.wa },
  convInfo: { flex: 1, gap: 4 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '800', color: C.text, flex: 1, marginRight: 8 },
  convTime: { fontSize: 11, color: C.textMuted },
  convBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convPreview: { fontSize: 13, color: C.textSub, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: C.wa,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },

  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  notConfiguredIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: C.waLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConfiguredTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  notConfiguredDesc: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  featureText: { fontSize: 13, color: C.textSub, flex: 1 },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.wa,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
});
