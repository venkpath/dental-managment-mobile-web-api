import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDrawer } from '../../components/DrawerMenu';
import { useBottomInset } from '../../hooks/useBottomInset';
import EmptyState from '../../components/EmptyState';
import { notificationsService, type AppNotification } from '../../services/notifications.service';
import { useNotificationStore } from '../../store/notification.store';
import { navigateFromNotificationData } from '../../utils/notificationNavigation';
import type { RootStackParamList } from '../../types';

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

const TYPE_META: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  appointment_confirmed: { icon: 'checkmark-circle', color: '#4361EE', bg: '#EEF2FF' },
  appointment_reminder: { icon: 'alarm', color: '#d97706', bg: '#fef3c7' },
  support_reply: { icon: 'chatbubble-ellipses', color: '#2563eb', bg: '#dbeafe' },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

export default function NotificationListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const { refreshUnreadCount, clearUnread } = useNotificationStore();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      const res = await notificationsService.list({ page: p, limit: 25 });
      setItems((prev) => (append ? [...prev, ...res.data] : res.data));
      setPage(p);
      setHasMore(p < (res.meta?.totalPages ?? 1));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1, false);
      refreshUnreadCount();
    }, [load, refreshUnreadCount]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(1, false);
  };

  const onMarkAllRead = async () => {
    await notificationsService.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    clearUnread();
  };

  const onPressItem = async (item: AppNotification) => {
    if (!item.is_read) {
      await notificationsService.markRead(item.id).catch(() => {});
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
      useNotificationStore.getState().decrementUnread();
    }
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    if (meta.appointment_id || meta.ticket_id || item.type === 'support_reply') {
      navigation.goBack();
      navigateFromNotificationData(meta);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = TYPE_META[item.type] ?? { icon: 'notifications' as const, color: C.indigo, bg: C.indigoLight };
    return (
      <TouchableOpacity
        style={[s.card, !item.is_read && s.cardUnread]}
        onPress={() => onPressItem(item)}
        activeOpacity={0.75}
      >
        <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.cardHead}>
            <Text style={[s.cardTitle, !item.is_read && s.cardTitleBold]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.cardTime}>{formatWhen(item.created_at)}</Text>
          </View>
          <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text>
        </View>
        {!item.is_read && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Notifications</Text>
          <Text style={s.subtitle}>Appointments & alerts</Text>
        </View>
        <TouchableOpacity onPress={onMarkAllRead} style={s.markAllBtn} activeOpacity={0.7}>
          <Text style={s.markAllTxt}>Read all</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: 16 + bottomInset }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.indigo]} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              subtitle="Appointment confirmations and reminders will appear here."
              icon="notifications-outline"
            />
          }
          onEndReached={() => {
            if (hasMore && !loading) load(page + 1, true);
          }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  markAllTxt: { fontSize: 13, fontWeight: '600', color: C.indigo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardUnread: { borderColor: '#c7d7ff', backgroundColor: '#fafbff' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, color: C.text },
  cardTitleBold: { fontWeight: '700' },
  cardTime: { fontSize: 11, color: C.textMuted },
  cardBody: { fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.indigo, marginTop: 6 },
});
