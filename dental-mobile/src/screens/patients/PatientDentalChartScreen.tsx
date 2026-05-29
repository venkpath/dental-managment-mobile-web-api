import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  teethService,
  CONDITION_COLOR,
  CONDITIONS,
  SEVERITY_COLOR,
  type PatientToothCondition,
  type Tooth,
  type ToothSurface,
  type ToothCondition,
  type ToothSeverity,
} from '../../services/teeth.service';
import { useAuthStore } from '../../store/auth.store';
import { useBottomInset } from '../../hooks/useBottomInset';
import { ChartAnalysisPanel } from './_components/ChartAnalysisPanel';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'PatientDentalChart'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

// FDI quadrant arrays — same as the mini chart but rendered bigger
const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT  = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_LEFT  = ['31', '32', '33', '34', '35', '36', '37', '38'];
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];

function groupByTooth(conditions: PatientToothCondition[]): Map<string, PatientToothCondition[]> {
  const map = new Map<string, PatientToothCondition[]>();
  for (const c of conditions) {
    const fdi = c.tooth?.fdi_number;
    if (!fdi) continue;
    const list = map.get(fdi) ?? [];
    list.push(c);
    map.set(fdi, list);
  }
  return map;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Tooth cell (larger) ────────────────────────────────────────────────────
function ToothCell({
  fdi, conditions, onPress, highlighted, width,
}: {
  fdi: string;
  conditions: PatientToothCondition[];
  onPress: () => void;
  highlighted?: boolean;
  width: number;
}) {
  const primary = conditions[0]?.condition;
  const color = primary ? CONDITION_COLOR[primary] : undefined;
  const hasMultiple = conditions.length > 1;

  return (
    <TouchableOpacity
      style={[
        s.tooth,
        { width, height: width + 6 },
        color && { borderColor: color, backgroundColor: color + '25' },
        highlighted && { borderWidth: 2.5, borderColor: '#4361EE', shadowColor: '#4361EE', shadowOpacity: 0.3, shadowRadius: 5 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.toothFdi, color && { color: '#0f172a', fontWeight: '800' }]}>{fdi}</Text>
      {hasMultiple && (
        <View style={s.toothBadge}>
          <Text style={s.toothBadgeTxt}>{conditions.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function PatientDentalChartScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { patientId, patientName } = route.params;
  const { branchId, user } = useAuthStore();

  const [conditions, setConditions] = useState<PatientToothCondition[]>([]);
  const [allTeeth, setAllTeeth] = useState<Tooth[]>([]);
  const [surfaces, setSurfaces] = useState<ToothSurface[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFdi, setActiveFdi] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      teethService.getPatientChart(patientId),
      teethService.listAllTeeth(),
      teethService.listSurfaces(),
    ]).then(([conds, teeth, surfs]) => {
      setConditions(conds);
      setAllTeeth(teeth);
      setSurfaces(surfs);
    }).finally(() => setLoading(false));
  }, [patientId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const byTooth = useMemo(() => groupByTooth(conditions), [conditions]);

  const handleSaveCondition = async (
    cond: ToothCondition,
    sev: ToothSeverity | null,
    surfaceId: string | null,
    notes: string,
  ) => {
    if (!activeFdi) return;
    const tooth = allTeeth.find((t) => t.fdi_number === activeFdi);
    if (!tooth) { Alert.alert('Tooth not found'); return; }
    if (!branchId) { Alert.alert('Branch missing'); return; }
    try {
      const created = await teethService.addCondition({
        patient_id: patientId,
        branch_id: branchId,
        tooth_id: tooth.id,
        surface_id: surfaceId ?? undefined,
        condition: cond,
        severity: sev ?? undefined,
        notes: notes.trim() || undefined,
        diagnosed_by: user?.id,
      });
      setConditions((prev) => [created, ...prev]);
      setAddDialogOpen(false);
    } catch (err) {
      Alert.alert('Save failed', (err as { message?: string })?.message ?? 'Try again.');
    }
  };

  const handleDeleteCondition = (id: string) => {
    Alert.alert(
      'Remove condition?',
      'This will delete the condition from the tooth.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await teethService.deleteCondition(id);
              setConditions((prev) => prev.filter((c) => c.id !== id));
            } catch {
              Alert.alert('Delete failed', 'Try again.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[s.safe, { paddingTop: insets.top }]}>
        <TopBar onBack={() => navigation.goBack()} title="Dental Chart" subtitle={patientName} />
        <View style={s.center}><ActivityIndicator size="large" color="#4361EE" /></View>
      </View>
    );
  }

  const affected = byTooth.size;
  const total = conditions.length;
  const healthy = Math.max(0, 32 - affected);
  const activeConditions = activeFdi ? byTooth.get(activeFdi) ?? [] : [];
  const activeTooth = activeFdi ? allTeeth.find((t) => t.fdi_number === activeFdi) : null;

  // Larger tooth cell width for the full screen
  const TW = 32;

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <TopBar onBack={() => navigation.goBack()} title="Dental Chart" subtitle={patientName} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + bottomInset, gap: 14 }}>
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statTile}>
            <Text style={s.statNum}>{affected}</Text>
            <Text style={s.statLbl}>Affected</Text>
          </View>
          <View style={s.statTile}>
            <Text style={s.statNum}>{total}</Text>
            <Text style={s.statLbl}>Conditions</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[s.statNum, { color: '#15803D' }]}>{healthy}</Text>
            <Text style={[s.statLbl, { color: '#166534' }]}>Healthy</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={s.chartCard}>
          <View style={s.chartLabels}>
            <Text style={s.chartLabelTxt}>Right</Text>
            <Text style={s.chartLabelTxt}>Left</Text>
          </View>

          <View style={s.jaw}>
            <View style={s.quadrant}>
              {UPPER_RIGHT.map((fdi) => (
                <ToothCell
                  key={fdi}
                  fdi={fdi}
                  conditions={byTooth.get(fdi) ?? []}
                  onPress={() => setActiveFdi(fdi)}
                  highlighted={activeFdi === fdi}
                  width={TW}
                />
              ))}
            </View>
            <View style={s.midline} />
            <View style={s.quadrant}>
              {UPPER_LEFT.map((fdi) => (
                <ToothCell
                  key={fdi}
                  fdi={fdi}
                  conditions={byTooth.get(fdi) ?? []}
                  onPress={() => setActiveFdi(fdi)}
                  highlighted={activeFdi === fdi}
                  width={TW}
                />
              ))}
            </View>
          </View>

          <View style={s.jawSeparator} />

          <View style={s.jaw}>
            <View style={s.quadrant}>
              {LOWER_RIGHT.map((fdi) => (
                <ToothCell
                  key={fdi}
                  fdi={fdi}
                  conditions={byTooth.get(fdi) ?? []}
                  onPress={() => setActiveFdi(fdi)}
                  highlighted={activeFdi === fdi}
                  width={TW}
                />
              ))}
            </View>
            <View style={s.midline} />
            <View style={s.quadrant}>
              {LOWER_LEFT.map((fdi) => (
                <ToothCell
                  key={fdi}
                  fdi={fdi}
                  conditions={byTooth.get(fdi) ?? []}
                  onPress={() => setActiveFdi(fdi)}
                  highlighted={activeFdi === fdi}
                  width={TW}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Selected tooth panel */}
        {activeFdi && (
          <View style={s.detailPanel}>
            <View style={s.detailHead}>
              <View>
                <Text style={s.detailTitle}>Tooth #{activeFdi}</Text>
                <Text style={s.detailSub}>
                  {activeTooth?.name ?? 'Tooth'}{activeTooth?.quadrant ? ` · ${activeTooth.quadrant}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveFdi(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {activeConditions.length === 0 ? (
              <Text style={s.detailEmpty}>No conditions recorded for this tooth.</Text>
            ) : (
              <View style={{ gap: 6 }}>
                {activeConditions.map((c) => {
                  const color = CONDITION_COLOR[c.condition] ?? '#94a3b8';
                  const sev = c.severity ? SEVERITY_COLOR[c.severity] : null;
                  return (
                    <View key={c.id} style={s.condRow}>
                      <View style={[s.condDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={s.condName}>{c.condition}</Text>
                          {sev && (
                            <View style={[s.sevPill, { backgroundColor: sev.bg }]}>
                              <Text style={[s.sevPillTxt, { color: sev.text }]}>{c.severity}</Text>
                            </View>
                          )}
                          {c.surface && (
                            <Text style={s.condSurface}>· {c.surface.name} ({c.surface.code})</Text>
                          )}
                        </View>
                        {!!c.notes && <Text style={s.condNotes}>{c.notes}</Text>}
                        <Text style={s.condMeta}>
                          {c.diagnosedBy?.name ? `${c.diagnosedBy.name} · ` : ''}{formatDate(c.created_at)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteCondition(c.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={15} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={s.addCondBtn} onPress={() => setAddDialogOpen(true)}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={s.addCondBtnTxt}>Add Condition</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All conditions list (overview) */}
        {!activeFdi && conditions.length > 0 && (
          <View style={s.allCondCard}>
            <Text style={s.allCondTitle}>All Conditions ({conditions.length})</Text>
            {conditions.slice(0, 10).map((c) => {
              const color = CONDITION_COLOR[c.condition] ?? '#94a3b8';
              return (
                <TouchableOpacity
                  key={c.id}
                  style={s.allCondRow}
                  onPress={() => setActiveFdi(c.tooth?.fdi_number ?? null)}
                  activeOpacity={0.7}
                >
                  <View style={[s.allCondDot, { backgroundColor: color }]} />
                  <Text style={s.allCondTooth}>#{c.tooth?.fdi_number}</Text>
                  <Text style={s.allCondName}>{c.condition}</Text>
                  {c.severity && (
                    <View style={[s.sevPill, { backgroundColor: SEVERITY_COLOR[c.severity]?.bg ?? '#F1F5F9' }]}>
                      <Text style={[s.sevPillTxt, { color: SEVERITY_COLOR[c.severity]?.text ?? '#475569' }]}>{c.severity}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </TouchableOpacity>
              );
            })}
            {conditions.length > 10 && (
              <Text style={s.moreTxt}>+{conditions.length - 10} more</Text>
            )}
          </View>
        )}

        {/* AI Chart Analysis */}
        <ChartAnalysisPanel patientId={patientId} />

        {/* Legend */}
        <View style={s.legendCard}>
          <Text style={s.legendTitle}>Legend</Text>
          <View style={s.legendGrid}>
            {CONDITIONS.map((c) => (
              <View key={c} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: CONDITION_COLOR[c] }]} />
                <Text style={s.legendTxt}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <AddConditionDialog
        visible={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        surfaces={surfaces}
        toothFdi={activeFdi}
        onSave={handleSaveCondition}
      />
    </View>
  );
}

function TopBar({ onBack, title, subtitle }: { onBack: () => void; title: string; subtitle?: string }) {
  return (
    <View style={s.topbar}>
      <TouchableOpacity onPress={onBack} style={s.iconBtn}>
        <Ionicons name="arrow-back" size={20} color="#0f172a" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.topTitle}>{title}</Text>
        {subtitle && <Text style={s.topSubtitle} numberOfLines={1}>For {subtitle}</Text>}
      </View>
    </View>
  );
}

// ─── Add condition dialog (re-used) ─────────────────────────────────────────
function AddConditionDialog({
  visible, onClose, surfaces, toothFdi, onSave,
}: {
  visible: boolean;
  onClose: () => void;
  surfaces: ToothSurface[];
  toothFdi: string | null;
  onSave: (cond: ToothCondition, sev: ToothSeverity | null, surfaceId: string | null, notes: string) => void;
}) {
  const [condition, setCondition] = useState<ToothCondition>('Cavity');
  const [severity, setSeverity] = useState<ToothSeverity | null>(null);
  const [surfaceId, setSurfaceId] = useState<string | null>(null);
  const [notes] = useState('');
  const [pickerOpen, setPickerOpen] = useState<null | 'condition' | 'severity' | 'surface'>(null);

  useEffect(() => {
    if (visible) {
      setCondition('Cavity');
      setSeverity(null);
      setSurfaceId(null);
    }
  }, [visible]);

  const surfaceName = surfaces.find((sx) => sx.id === surfaceId)?.name ?? null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ds.backdrop} onPress={onClose}>
        <Pressable style={ds.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={ds.head}>
            <Text style={ds.title}>Add Condition · Tooth #{toothFdi ?? ''}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={ds.label}>Condition *</Text>
          <TouchableOpacity style={ds.field} onPress={() => setPickerOpen('condition')}>
            <View style={[ds.colorDot, { backgroundColor: CONDITION_COLOR[condition] }]} />
            <Text style={ds.fieldTxt}>{condition}</Text>
            <Ionicons name="chevron-down" size={14} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={[ds.label, { marginTop: 10 }]}>Severity</Text>
          <TouchableOpacity style={ds.field} onPress={() => setPickerOpen('severity')}>
            <Text style={[ds.fieldTxt, !severity && { color: '#94a3b8' }]}>
              {severity ?? '— Pick severity —'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#94a3b8" />
          </TouchableOpacity>

          {surfaces.length > 0 && (
            <>
              <Text style={[ds.label, { marginTop: 10 }]}>Surface</Text>
              <TouchableOpacity style={ds.field} onPress={() => setPickerOpen('surface')}>
                <Text style={[ds.fieldTxt, !surfaceId && { color: '#94a3b8' }]}>
                  {surfaceName ?? '— Pick surface —'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </TouchableOpacity>
            </>
          )}

          <View style={ds.actions}>
            <TouchableOpacity style={ds.cancelBtn} onPress={onClose}>
              <Text style={ds.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ds.saveBtn}
              onPress={() => onSave(condition, severity, surfaceId, notes)}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={ds.saveTxt}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Sub pickers */}
          <SubPicker
            visible={pickerOpen === 'condition'}
            title="Condition"
            options={CONDITIONS}
            value={condition}
            onSelect={(v) => setCondition(v as ToothCondition)}
            onClose={() => setPickerOpen(null)}
            renderLeading={(opt) => (
              <View style={[ds.colorDot, { backgroundColor: CONDITION_COLOR[opt] }]} />
            )}
          />
          <SubPicker
            visible={pickerOpen === 'severity'}
            title="Severity"
            options={['mild', 'moderate', 'severe']}
            value={severity ?? ''}
            onSelect={(v) => setSeverity(v as ToothSeverity)}
            onClose={() => setPickerOpen(null)}
          />
          <SubPicker
            visible={pickerOpen === 'surface'}
            title="Surface"
            options={surfaces.map((sf) => `${sf.name} (${sf.code})`)}
            value={surfaceName ? `${surfaceName} (${surfaces.find((sx) => sx.id === surfaceId)?.code ?? ''})` : ''}
            onSelect={(label) => {
              const surf = surfaces.find((sx) => `${sx.name} (${sx.code})` === label);
              if (surf) setSurfaceId(surf.id);
            }}
            onClose={() => setPickerOpen(null)}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SubPicker({
  visible, title, options, value, onSelect, onClose, renderLeading,
}: {
  visible: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  renderLeading?: (opt: string) => React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ps.backdrop} onPress={onClose}>
        <Pressable style={ps.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={ps.head}>
            <Text style={ps.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[ps.item, value === opt && ps.itemActive]}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                {renderLeading?.(opt)}
                <Text style={[ps.itemTxt, value === opt && ps.itemTxtActive]}>{opt}</Text>
                {value === opt && <Ionicons name="checkmark" size={16} color="#4361EE" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  topSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statTile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  statLbl: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.3 },

  chartCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  chartLabelTxt: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 },
  jaw: { flexDirection: 'row', alignItems: 'center' },
  quadrant: { flex: 1, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 3 },
  midline: { width: 1, height: 30, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
  jawSeparator: { height: 8 },

  tooth: {
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  toothFdi: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  toothBadge: {
    position: 'absolute', top: -5, right: -5,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#4361EE',
    alignItems: 'center', justifyContent: 'center',
  },
  toothBadgeTxt: { fontSize: 8, fontWeight: '800', color: '#fff' },

  // Detail
  detailPanel: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  detailHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  detailTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  detailSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  detailEmpty: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 6 },

  condRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  condDot: { width: 9, height: 9, borderRadius: 4.5, marginTop: 4 },
  condName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  condSurface: { fontSize: 11, color: '#64748b' },
  sevPill: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 },
  sevPillTxt: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  condNotes: { fontSize: 12, color: '#475569', marginTop: 3 },
  condMeta: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  addCondBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#4361EE', paddingVertical: 11, borderRadius: 10,
  },
  addCondBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // All conditions list
  allCondCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  allCondTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.4, marginBottom: 4 },
  allCondRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  allCondDot: { width: 9, height: 9, borderRadius: 4.5 },
  allCondTooth: { fontSize: 12, fontWeight: '700', color: '#475569', width: 35 },
  allCondName: { flex: 1, fontSize: 13, color: '#0f172a' },
  moreTxt: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingTop: 5 },

  // Legend
  legendCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  legendTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.4 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendTxt: { fontSize: 11, color: '#475569' },
});

const ds = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 4,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  fieldTxt: { flex: 1, fontSize: 13, color: '#0f172a', fontWeight: '600' },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelTxt: { fontSize: 13, fontWeight: '700', color: '#475569' },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, backgroundColor: '#4361EE',
  },
  saveTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8, paddingBottom: 20,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  itemActive: { backgroundColor: '#EEF2FF' },
  itemTxt: { flex: 1, fontSize: 14, color: '#0f172a', textTransform: 'capitalize' },
  itemTxtActive: { color: '#4361EE', fontWeight: '700' },
});
