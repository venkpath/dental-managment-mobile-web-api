import React, { useState, useCallback } from 'react';
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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { treatmentService } from '../../services/treatment.service';
import { formatCurrency } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import { useBottomInset } from '../../hooks/useBottomInset';
import { treatmentStatusMeta } from '../../utils/treatmentStatus';
import type { Treatment, PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'PatientTreatments'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  green: '#059669', greenLight: '#d1fae5',
  amber: '#d97706', amberLight: '#fef3c7',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

export default function TreatmentListScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { patientId, patientName } = route.params;
  const bottomInset = useBottomInset();

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await treatmentService.listByPatient(patientId);
      setTreatments(data);
    } catch {
      /* keep list */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Treatment }) => {
    const sm = treatmentStatusMeta(item.status);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TreatmentDetail', { treatmentId: item.id })}
        style={s.card}
      >
        <View style={s.cardRow}>
          <View style={[s.iconBox, { backgroundColor: sm.bg }]}>
            <Ionicons name="medkit" size={20} color={sm.fg} />
          </View>
          <View style={s.cardInfo}>
            <Text style={s.procedure} numberOfLines={1}>{item.procedure}</Text>
            {item.tooth_number ? <Text style={s.tooth}>Tooth {item.tooth_number}</Text> : null}
            <Text style={s.diagnosis} numberOfLines={1}>{item.diagnosis}</Text>
            <Text style={s.dentist}>Dr. {item.dentist.name}</Text>
          </View>
          <View style={s.cardRight}>
            <Text style={s.cost}>{formatCurrency(Number(item.cost))}</Text>
            <View style={[s.statusPill, { backgroundColor: sm.bg }]}>
              <Text style={[s.statusPillTxt, { color: sm.fg }]}>{sm.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>Treatments</Text>
          <Text style={s.subtitle} numberOfLines={1}>{patientName}</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('AddTreatment', { patientId, patientName })}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : (
        <FlatList
          data={treatments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: 16 + bottomInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[C.indigo]} />}
          ListEmptyComponent={
            <EmptyState title="No treatments yet" subtitle="Tap + to record the first treatment" icon="medkit-outline" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, gap: 3 },
  procedure: { fontSize: 15, fontWeight: '800', color: C.text },
  tooth: { fontSize: 11, fontWeight: '700', color: C.violet },
  diagnosis: { fontSize: 12, color: C.textSub },
  dentist: { fontSize: 11, color: C.indigo, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  cost: { fontSize: 16, fontWeight: '800', color: C.text },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillTxt: { fontSize: 10, fontWeight: '700' },
});
