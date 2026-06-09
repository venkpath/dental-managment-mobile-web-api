import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supportService, type SupportTicketSummary } from '../../services/support.service';
import EmptyState from '../../components/EmptyState';
import type { BillingStackParamList } from '../../types';

const STATUS_COLOR: Record<string, string> = {
  open: '#d97706',
  in_progress: '#2563eb',
  resolved: '#059669',
  closed: '#64748b',
};

type Nav = NativeStackNavigationProp<BillingStackParamList, 'SupportTicketList'>;

export default function SupportTicketListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await supportService.listMine();
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.title}>Support tickets</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewSupportTicket')} hitSlop={12}>
          <Ionicons name="add-circle" size={28} color="#4361EE" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#4361EE" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={items.length === 0 ? { flex: 1 } : { padding: 16, gap: 10 }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No tickets yet"
              subtitle="Tap + above to contact our support team"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('SupportTicketDetail', { ticketId: item.id })}
            >
              <View style={s.cardTop}>
                <Text style={s.subject} numberOfLines={1}>{item.subject}</Text>
                <View style={[s.badge, { backgroundColor: `${STATUS_COLOR[item.status] ?? '#64748b'}20` }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[item.status] ?? '#64748b' }]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={s.meta}>{item.category.replace('_', ' ')} · {new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subject: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 6, textTransform: 'capitalize' },
});
