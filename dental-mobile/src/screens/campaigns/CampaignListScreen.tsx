import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { campaignsService, type Campaign } from '../../services/campaigns.service';
import EmptyState from '../../components/EmptyState';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  red: '#dc2626', redLight: '#fee2e2',
  blue: '#2563eb', blueLight: '#dbeafe',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

const SEGMENT_LABELS: Record<string, string> = {
  all: 'All patients',
  inactive: 'Inactive',
  treatment_type: 'By treatment',
  location: 'By branch',
  no_show_risk: 'No-show risk',
  churn_risk: 'Churn risk',
  recall_due: 'Recall due',
};

function statusStyle(status: string) {
  switch (status) {
    case 'completed': return { bg: C.greenLight, fg: C.green };
    case 'running': return { bg: C.amberLight, fg: C.amber };
    case 'scheduled': return { bg: C.blueLight, fg: C.blue };
    case 'failed': return { bg: C.redLight, fg: C.red };
    default: return { bg: '#f1f5f9', fg: C.textSub };
  }
}

export default function CampaignListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await campaignsService.list({ page: 1, limit: 50 });
      setItems(res.data ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Campaign }) => {
    const st = statusStyle(item.status);
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
      >
        <View style={s.cardHead}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={[s.pill, { backgroundColor: st.bg }]}>
            <Text style={[s.pillTxt, { color: st.fg }]}>{item.status}</Text>
          </View>
        </View>
        <View style={s.metaRow}>
          <View style={s.channelPill}>
            <Ionicons
              name={item.channel === 'whatsapp' ? 'logo-whatsapp' : item.channel === 'email' ? 'mail' : 'phone-portrait'}
              size={12}
              color={C.textSub}
            />
            <Text style={s.metaTxt}>{item.channel}</Text>
          </View>
          <Text style={s.metaTxt}>{SEGMENT_LABELS[item.segment_type] ?? item.segment_type}</Text>
        </View>
        {item.template?.template_name && (
          <Text style={s.templateTxt} numberOfLines={1}>Template: {item.template.template_name}</Text>
        )}
        {(item.status === 'completed' || item.status === 'running') && (
          <Text style={s.statsTxt}>
            Recipients {item.total_recipients ?? 0} · Sent {item.sent_count ?? 0}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Campaigns</Text>
          <Text style={s.subtitle}>Bulk patient messaging</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('CreateCampaign')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: 16 + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.indigo]} />}
          ListEmptyComponent={
            <EmptyState
              title="No campaigns yet"
              subtitle="Create a campaign to message patient groups via WhatsApp, SMS, or email."
              icon="megaphone-outline"
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, gap: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  channelPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: C.textSub, textTransform: 'capitalize' },
  templateTxt: { fontSize: 11, color: C.textMuted, fontFamily: 'monospace' },
  statsTxt: { fontSize: 12, color: C.textSub },
});
