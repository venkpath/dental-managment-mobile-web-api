import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { prescriptionService } from '../../services/prescription.service';
import { getLocale } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { Prescription, PrescriptionMedicine, BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'PrescriptionDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  red: '#dc2626', redLight: '#fee2e2',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6', grayLight: '#f1f5f9',
};

function scheduleLabel(m: PrescriptionMedicine): string | null {
  const parts: string[] = [];
  if (m.morning) parts.push(`${m.morning} morning`);
  if (m.afternoon) parts.push(`${m.afternoon} afternoon`);
  if (m.evening) parts.push(`${m.evening} evening`);
  if (m.night) parts.push(`${m.night} night`);
  return parts.length ? parts.join(' · ') : null;
}

export default function PrescriptionDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { prescriptionId } = route.params;

  const [rx, setRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      prescriptionService.getDetail(prescriptionId)
        .then((data) => {
          if (!active) return;
          if (data) setRx(data);
          else setLoadError(true);
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLoadError(true);
          setLoading(false);
        });
      return () => { active = false; };
    }, [prescriptionId])
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await prescriptionService.getPdfUrl(prescriptionId);
      const target = FileSystem.documentDirectory + `prescription_${prescriptionId}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Prescription PDF', UTI: 'com.adobe.pdf' });
      } else {
        await Linking.openURL(url);
      }
    } catch (err: unknown) {
      Alert.alert('Download failed', err instanceof Error ? err.message : 'Could not download the PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const url = await prescriptionService.getPdfUrl(prescriptionId);
      const target = FileSystem.cacheDirectory + `prescription_print_${prescriptionId}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, target);
      await Print.printAsync({ uri });
    } catch (err: unknown) {
      Alert.alert('Print failed', err instanceof Error ? err.message : 'Could not open the print dialog.');
    } finally {
      setPrinting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setSending(true);
    try {
      await prescriptionService.sendWhatsApp(prescriptionId);
      Alert.alert('Sent', 'Prescription sent to the patient via WhatsApp.');
    } catch (err: unknown) {
      Alert.alert('Send failed', err instanceof Error ? err.message : 'Could not send the prescription.');
    } finally {
      setSending(false);
    }
  };

  // ── Header (shared across loading / loaded states) ──
  const Header = (
    <View style={[s.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <View style={s.hTitleBlock}>
        <Text style={s.hTitle}>Prescription</Text>
        {rx && (
          <Text style={s.hSub} numberOfLines={1}>
            {new Date(rx.created_at).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('EditPrescription', { prescriptionId })}
        style={s.hBtn}
        activeOpacity={0.7}
        disabled={!rx}
      >
        <Ionicons name="create-outline" size={20} color={rx ? C.text : C.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handlePrint} style={s.hBtn} activeOpacity={0.7} disabled={printing || !rx}>
        {printing ? <ActivityIndicator size="small" color={C.text} /> : <Ionicons name="print-outline" size={20} color={rx ? C.text : C.textMuted} />}
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDownload} style={s.hBtn} activeOpacity={0.7} disabled={downloading || !rx}>
        {downloading ? <ActivityIndicator size="small" color={C.text} /> : <Ionicons name="download-outline" size={20} color={rx ? C.text : C.textMuted} />}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  if (!rx) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
          <Text style={s.errText}>{loadError ? 'Failed to load prescription.' : 'Prescription not found.'}</Text>
        </View>
      </View>
    );
  }

  const meds = rx.items ?? [];
  const clinical: Array<{ label: string; value?: string }> = [
    { label: 'Diagnosis', value: rx.diagnosis },
    { label: 'Chief Complaint', value: rx.chief_complaint },
    { label: 'Allergies / Medical History', value: rx.allergies_medical_history },
    { label: 'Past Dental History', value: rx.past_dental_history },
  ];
  const advice: Array<{ label: string; value?: string }> = [
    { label: 'Instructions', value: rx.instructions },
    { label: 'Dietary Advice', value: rx.dietary_advice },
    { label: 'Post-procedure Instructions', value: rx.post_procedure_instructions },
    { label: 'Drug Interactions', value: rx.interactions },
    { label: 'Follow Up', value: rx.follow_up },
  ];
  const hasClinical = clinical.some((c) => c.value);
  const hasAdvice = advice.some((a) => a.value);

  return (
    <View style={s.screen}>
      {Header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: 24 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Parties card */}
        <View style={s.card}>
          <View style={s.rxHeadRow}>
            <View style={s.rxBadge}><Text style={s.rxText}>Rx</Text></View>
            <Text style={s.rxDate}>
              {new Date(rx.created_at).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <View style={s.divider} />

          <Text style={s.fieldLabel}>PATIENT</Text>
          <Text style={s.partyName}>
            {rx.patient ? `${rx.patient.first_name} ${rx.patient.last_name}` : 'Unknown patient'}
          </Text>
          {rx.patient?.phone ? <Text style={s.partySub}>{rx.patient.phone}</Text> : null}

          <View style={s.twoCol}>
            <View style={s.colHalf}>
              <Text style={s.fieldLabel}>DOCTOR</Text>
              <Text style={s.colValue}>Dr. {rx.dentist?.name ?? '—'}</Text>
            </View>
            <View style={s.colHalf}>
              <Text style={s.fieldLabel}>BRANCH</Text>
              <Text style={s.colValue}>{rx.branch?.name ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Clinical info */}
        {hasClinical && (
          <View style={s.card}>
            <View style={s.sectionHead}>
              <Ionicons name="clipboard-outline" size={18} color={C.indigo} />
              <Text style={s.sectionTitle}>Clinical Notes</Text>
            </View>
            {clinical.filter((c) => c.value).map((c) => (
              <View key={c.label} style={s.noteBlock}>
                <Text style={s.fieldLabel}>{c.label.toUpperCase()}</Text>
                <Text style={s.noteValue}>{c.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Medicines */}
        <View style={s.card}>
          <View style={s.sectionHead}>
            <Ionicons name="medical-outline" size={18} color={C.indigo} />
            <Text style={s.sectionTitle}>Medicines</Text>
            <View style={s.countChip}><Text style={s.countChipTxt}>{meds.length}</Text></View>
          </View>

          {meds.length === 0 ? (
            <Text style={s.emptyMeds}>No medicines on this prescription.</Text>
          ) : (
            meds.map((m, idx) => {
              const sub = [m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ');
              const sched = scheduleLabel(m);
              return (
                <View key={m.id ?? idx} style={[s.medItem, idx < meds.length - 1 && s.medItemBorder]}>
                  <View style={s.medTop}>
                    <View style={s.medDot} />
                    <Text style={s.medName}>{m.medicine_name}</Text>
                  </View>
                  {sub ? <Text style={s.medSub}>{sub}</Text> : null}
                  {sched ? (
                    <View style={s.schedRow}>
                      <Ionicons name="time-outline" size={12} color={C.textMuted} />
                      <Text style={s.schedTxt}>{sched}</Text>
                    </View>
                  ) : null}
                  {m.purpose ? <Text style={s.medMeta}>Purpose: {m.purpose}</Text> : null}
                  {m.notes ? <Text style={s.medMeta}>{m.notes}</Text> : null}
                  {m.warnings ? (
                    <View style={s.warnRow}>
                      <Ionicons name="warning-outline" size={12} color={C.amber} />
                      <Text style={s.warnTxt}>{m.warnings}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* Advice */}
        {hasAdvice && (
          <View style={s.card}>
            <View style={s.sectionHead}>
              <Ionicons name="reader-outline" size={18} color={C.indigo} />
              <Text style={s.sectionTitle}>Advice & Follow Up</Text>
            </View>
            {advice.filter((a) => a.value).map((a) => (
              <View key={a.label} style={s.noteBlock}>
                <Text style={s.fieldLabel}>{a.label.toUpperCase()}</Text>
                <Text style={s.noteValue}>{a.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionCard} onPress={handleSendWhatsApp} disabled={sending} activeOpacity={0.7}>
            <View style={[s.actionIconWrap, { backgroundColor: C.greenLight }]}>
              {sending ? <ActivityIndicator size="small" color={C.green} /> : <Ionicons name="logo-whatsapp" size={20} color={C.green} />}
            </View>
            <Text style={[s.actionLabel, { color: C.green }]}>Send{'\n'}WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={handleDownload} disabled={downloading} activeOpacity={0.7}>
            <View style={[s.actionIconWrap, { backgroundColor: C.indigoLight }]}>
              {downloading ? <ActivityIndicator size="small" color={C.indigo} /> : <Ionicons name="download-outline" size={20} color={C.indigo} />}
            </View>
            <Text style={[s.actionLabel, { color: C.indigo }]}>Download{'\n'}PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={handlePrint} disabled={printing} activeOpacity={0.7}>
            <View style={[s.actionIconWrap, { backgroundColor: C.grayLight }]}>
              {printing ? <ActivityIndicator size="small" color={C.textSub} /> : <Ionicons name="print-outline" size={20} color={C.textSub} />}
            </View>
            <Text style={[s.actionLabel, { color: C.textSub }]}>Print</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errText: { fontSize: 14, color: C.textSub },

  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  hBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hTitleBlock: { flex: 1, paddingHorizontal: 4 },
  hTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  hSub: { fontSize: 11, color: C.textSub, marginTop: 1 },

  content: { padding: 16, gap: 12 },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  rxHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rxBadge: { backgroundColor: C.indigo, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  rxText: { fontSize: 13, fontWeight: '800', color: '#fff', fontStyle: 'italic' },
  rxDate: { flex: 1, fontSize: 13, fontWeight: '600', color: C.text },

  divider: { height: 1, backgroundColor: C.divider, marginVertical: 12 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6 },
  partyName: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 3 },
  partySub: { fontSize: 13, color: C.textSub, marginTop: 1 },

  twoCol: { flexDirection: 'row', gap: 12, marginTop: 14 },
  colHalf: { flex: 1 },
  colValue: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 3 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  countChip: { backgroundColor: C.indigoLight, minWidth: 22, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, alignItems: 'center' },
  countChipTxt: { fontSize: 11, fontWeight: '700', color: C.indigo },

  noteBlock: { marginBottom: 12 },
  noteValue: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 3 },

  emptyMeds: { fontSize: 13, color: C.textMuted },
  medItem: { paddingVertical: 12 },
  medItemBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  medTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.indigo },
  medName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  medSub: { fontSize: 13, color: C.indigo, fontWeight: '600', marginTop: 4, marginLeft: 15 },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginLeft: 15 },
  schedTxt: { fontSize: 12, color: C.textSub },
  medMeta: { fontSize: 12, color: C.textMuted, marginTop: 4, marginLeft: 15, lineHeight: 17 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6, marginLeft: 15, backgroundColor: C.amberLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  warnTxt: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
