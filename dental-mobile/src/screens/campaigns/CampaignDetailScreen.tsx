import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  campaignsService,
  type Campaign,
  type CampaignAnalytics,
} from '../../services/campaigns.service';
import { formatCurrency, getLocale } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'CampaignDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList, 'CampaignDetail'>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF', bg: '#F8FAFC', surface: '#fff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8', border: '#E2E8F0',
  green: '#059669', red: '#dc2626',
};

export default function CampaignDetailScreen() {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await campaignsService.get(params.campaignId);
      setCampaign(c);
      if (c.status === 'completed' || c.status === 'running') {
        const a = await campaignsService.getAnalytics(params.campaignId).catch(() => null);
        setAnalytics(a);
      } else {
        setAnalytics(null);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load campaign');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [params.campaignId, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onExecute = () => {
    Alert.alert(
      'Execute campaign',
      'Send messages to all recipients in this audience?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          onPress: async () => {
            setActing(true);
            try {
              await campaignsService.execute(params.campaignId);
              Alert.alert('Started', 'Campaign execution has been queued.');
              load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Execute failed');
            } finally {
              setActing(false);
            }
          },
        },
      ],
    );
  };

  const onDelete = () => {
    Alert.alert('Delete campaign', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            await campaignsService.delete(params.campaignId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  if (loading || !campaign) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.indigo} />
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{campaign.name}</Text>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 24 + bottomInset }]}>
        <View style={s.hero}>
          <Text style={s.status}>{campaign.status}</Text>
          <Text style={s.meta}>Channel: {campaign.channel}</Text>
          <Text style={s.meta}>Segment: {campaign.segment_type.replace(/_/g, ' ')}</Text>
          {campaign.template?.template_name && (
            <Text style={s.meta}>Template: {campaign.template.template_name}</Text>
          )}
          <Text style={s.meta}>
            Created {new Date(campaign.created_at).toLocaleString(getLocale())}
          </Text>
        </View>

        <View style={s.statsGrid}>
          {[
            { label: 'Recipients', value: campaign.total_recipients ?? 0 },
            { label: 'Sent', value: campaign.sent_count ?? 0 },
            { label: 'Delivered', value: analytics?.delivered ?? campaign.delivered_count ?? 0 },
            { label: 'Failed', value: campaign.failed_count ?? 0 },
          ].map((x) => (
            <View key={x.label} style={s.statBox}>
              <Text style={s.statVal}>{x.value}</Text>
              <Text style={s.statLbl}>{x.label}</Text>
            </View>
          ))}
        </View>

        {analytics && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Delivery rate</Text>
            <Text style={s.bigVal}>{analytics.delivery_rate}%</Text>
            {analytics.roi && (
              <Text style={s.meta}>
                Cost {formatCurrency(analytics.roi.cost)} · ROI {analytics.roi.roi_percentage?.toFixed(1)}%
              </Text>
            )}
          </View>
        )}

        {campaign.status === 'draft' && (
          <View style={s.actions}>
            <TouchableOpacity style={s.primaryBtn} onPress={onExecute} disabled={acting}>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={s.primaryTxt}>{acting ? 'Please wait…' : 'Execute campaign'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dangerBtn} onPress={onDelete} disabled={acting}>
              <Ionicons name="trash-outline" size={18} color={C.red} />
              <Text style={s.dangerTxt}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  body: { padding: 16, gap: 14 },
  hero: { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, gap: 6 },
  status: { fontSize: 14, fontWeight: '700', color: C.indigo, textTransform: 'capitalize' },
  meta: { fontSize: 13, color: C.textSub },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '47%', backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: C.text },
  statLbl: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 13, color: C.textSub, marginBottom: 4 },
  bigVal: { fontSize: 28, fontWeight: '800', color: C.green },
  actions: { gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.indigo, borderRadius: 12, padding: 14 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fecaca' },
  dangerTxt: { color: C.red, fontWeight: '600' },
});
