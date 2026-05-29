import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  campaignsService,
  type CampaignChannel,
  type CampaignSegmentType,
} from '../../services/campaigns.service';
import { templatesService, type MessageTemplate } from '../../services/templates.service';
import { branchService } from '../../services/branch.service';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF', bg: '#F8FAFC', surface: '#fff',
  text: '#0f172a', textSub: '#475569', border: '#E2E8F0',
};

const CHANNELS: CampaignChannel[] = ['whatsapp', 'sms', 'email'];
const SEGMENTS: { key: CampaignSegmentType; label: string }[] = [
  { key: 'all', label: 'All patients' },
  { key: 'inactive', label: 'Inactive patients' },
  { key: 'treatment_type', label: 'By treatment' },
  { key: 'location', label: 'By branch' },
  { key: 'no_show_risk', label: 'No-show risk (AI)' },
  { key: 'churn_risk', label: 'Churn risk (AI)' },
  { key: 'recall_due', label: 'Recall due (AI)' },
];

export default function CreateCampaignScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<CampaignChannel>('whatsapp');
  const [segment, setSegment] = useState<CampaignSegmentType>('all');
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [procedures, setProcedures] = useState<Array<{ procedure: string; patient_count: number }>>([]);
  const [branchId, setBranchId] = useState('');
  const [procedure, setProcedure] = useState('');
  const [inactiveMonths, setInactiveMonths] = useState('6');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    templatesService.list({ channel }).then((r) => setTemplates(r.data ?? [])).catch(() => setTemplates([]));
  }, [channel]);

  useEffect(() => {
    branchService.list().then((b) => setBranches(b.map((x) => ({ id: x.id, name: x.name })))).catch(() => {});
    campaignsService.listTreatmentProcedures().then(setProcedures).catch(() => {});
  }, []);

  const segmentConfig = (): Record<string, unknown> | undefined => {
    if (segment === 'location' && branchId) return { branch_id: branchId };
    if (segment === 'treatment_type' && procedure) return { procedure };
    if (segment === 'inactive') return { inactive_months: parseInt(inactiveMonths, 10) || 6 };
    return undefined;
  };

  const previewAudience = async () => {
    setPreviewing(true);
    try {
      const res = await campaignsService.previewAudience(segment, segmentConfig());
      setAudienceCount(res.total_count);
    } catch (e) {
      Alert.alert('Preview failed', e instanceof Error ? e.message : 'Could not preview audience');
    } finally {
      setPreviewing(false);
    }
  };

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter a campaign name.');
      return;
    }
    if (!templateId && channel === 'whatsapp') {
      Alert.alert('Template required', 'Select a WhatsApp template for this campaign.');
      return;
    }
    setLoading(true);
    try {
      const created = await campaignsService.create({
        name: name.trim(),
        channel,
        segment_type: segment,
        segment_config: segmentConfig(),
        template_id: templateId,
      });
      Alert.alert('Created', 'Campaign saved as draft.', [
        {
          text: 'View',
          onPress: () => {
            navigation.goBack();
            navigation.navigate('CampaignDetail', { campaignId: created.id });
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="close" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>New campaign</Text>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 24 + bottomInset }]}>
        <Text style={s.label}>Campaign name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Recall reminder" />

        <Text style={s.label}>Channel</Text>
        <View style={s.chipRow}>
          {CHANNELS.map((ch) => (
            <TouchableOpacity
              key={ch}
              style={[s.chip, channel === ch && s.chipOn]}
              onPress={() => { setChannel(ch); setTemplateId(undefined); }}
            >
              <Text style={[s.chipTxt, channel === ch && s.chipTxtOn]}>{ch}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Audience</Text>
        <View style={s.chipWrap}>
          {SEGMENTS.map((seg) => (
            <TouchableOpacity
              key={seg.key}
              style={[s.chip, segment === seg.key && s.chipOn]}
              onPress={() => { setSegment(seg.key); setAudienceCount(null); }}
            >
              <Text style={[s.chipTxt, segment === seg.key && s.chipTxtOn]}>{seg.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {segment === 'location' && (
          <>
            <Text style={s.label}>Branch</Text>
            <View style={s.chipWrap}>
              {branches.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[s.chip, branchId === b.id && s.chipOn]}
                  onPress={() => setBranchId(b.id)}
                >
                  <Text style={[s.chipTxt, branchId === b.id && s.chipTxtOn]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {segment === 'treatment_type' && (
          <>
            <Text style={s.label}>Treatment procedure</Text>
            <View style={s.chipWrap}>
              {procedures.slice(0, 12).map((p) => (
                <TouchableOpacity
                  key={p.procedure}
                  style={[s.chip, procedure === p.procedure && s.chipOn]}
                  onPress={() => setProcedure(p.procedure)}
                >
                  <Text style={[s.chipTxt, procedure === p.procedure && s.chipTxtOn]}>
                    {p.procedure} ({p.patient_count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {segment === 'inactive' && (
          <>
            <Text style={s.label}>Inactive for (months)</Text>
            <TextInput
              style={s.input}
              value={inactiveMonths}
              onChangeText={setInactiveMonths}
              keyboardType="number-pad"
            />
          </>
        )}

        <TouchableOpacity style={s.previewBtn} onPress={previewAudience} disabled={previewing}>
          {previewing ? (
            <ActivityIndicator color={C.indigo} />
          ) : (
            <>
              <Ionicons name="people-outline" size={18} color={C.indigo} />
              <Text style={s.previewTxt}>
                {audienceCount != null ? `${audienceCount} recipients` : 'Preview audience'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.label}>Template</Text>
        {templates.length === 0 ? (
          <Text style={s.hint}>No templates for {channel}. Create templates on web.</Text>
        ) : (
          <View style={s.chipWrap}>
            {templates.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[s.chip, templateId === t.id && s.chipOn]}
                onPress={() => setTemplateId(t.id)}
              >
                <Text style={[s.chipTxt, templateId === t.id && s.chipTxtOn]} numberOfLines={1}>
                  {t.template_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={s.primaryBtn} onPress={onCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryTxt}>Save as draft</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  body: { padding: 16, gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: C.textSub, marginTop: 8 },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.indigoLight, borderColor: C.indigo },
  chipTxt: { fontSize: 13, color: C.textSub },
  chipTxtOn: { color: C.indigo, fontWeight: '700' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: C.indigoLight, borderRadius: 12, marginTop: 8 },
  previewTxt: { fontSize: 14, fontWeight: '600', color: C.indigo },
  hint: { fontSize: 13, color: C.textSub, fontStyle: 'italic' },
  primaryBtn: { backgroundColor: C.indigo, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
