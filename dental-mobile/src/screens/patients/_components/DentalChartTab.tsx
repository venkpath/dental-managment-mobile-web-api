import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  teethService,
  CONDITIONS,
  CONDITION_COLOR,
  SEVERITY_COLOR,
  type PatientToothCondition,
  type Tooth,
  type ToothSurface,
  type ToothCondition,
  type ToothSeverity,
} from '../../../services/teeth.service';
import {
  attachmentsService,
  type Attachment,
  type AttachmentType,
} from '../../../services/attachments.service';
import { useAuthStore } from '../../../store/auth.store';
import { SkeletonList } from '../../../components/Skeleton';
import { ZoomableImage } from '../../../components/ZoomableImage';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function groupConditionsByTooth(conditions: PatientToothCondition[]): Map<string, PatientToothCondition[]> {
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

// FDI numbering ordered per quadrant from midline outward
const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT  = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_LEFT  = ['31', '32', '33', '34', '35', '36', '37', '38'];
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];

// ─── Mini tooth (touchable) ─────────────────────────────────────────────────
function ToothCell({
  fdi, conditions, onPress, highlighted,
}: {
  fdi: string;
  conditions: PatientToothCondition[];
  onPress: () => void;
  highlighted?: boolean;
}) {
  const primary = conditions[0]?.condition;
  const color = primary ? CONDITION_COLOR[primary] : undefined;
  const hasMultiple = conditions.length > 1;

  return (
    <TouchableOpacity
      style={[
        s.tooth,
        color && { borderColor: color, backgroundColor: color + '20' },
        highlighted && { borderWidth: 2, borderColor: '#4361EE' },
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

// ─── Main DentalChartTab ─────────────────────────────────────────────────────
export interface DentalChartTabProps {
  patientId: string;
  patientName: string;
  onOpenFullChart: () => void;
}

export function DentalChartTab({ patientId, patientName, onOpenFullChart }: DentalChartTabProps) {
  const { branchId, user } = useAuthStore();

  const [conditions, setConditions] = useState<PatientToothCondition[]>([]);
  const [allTeeth, setAllTeeth] = useState<Tooth[]>([]);
  const [surfaces, setSurfaces] = useState<ToothSurface[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFdi, setActiveFdi] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadingType, setUploadingType] = useState<AttachmentType | null>(null);
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      teethService.getPatientChart(patientId),
      teethService.listAllTeeth(),
      teethService.listSurfaces(),
      attachmentsService.listByPatient(patientId),
    ]).then(([conds, teeth, surfs, atts]) => {
      setConditions(conds);
      setAllTeeth(teeth);
      setSurfaces(surfs);
      setAttachments(atts);
    }).finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => { refresh(); }, [refresh]);

  const conditionsByTooth = useMemo(() => groupConditionsByTooth(conditions), [conditions]);
  const xrays = attachments.filter((a) => a.type === 'xray');
  const reports = attachments.filter((a) => a.type === 'report' || a.type === 'document');
  const affectedTeeth = conditionsByTooth.size;

  // ── Pick & upload file ─────────────────────────────────────────────────────
  const pickAndUploadXray = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to your photo library to upload X-rays.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName ?? `xray-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      };
      setUploadingType('xray');
      const uploaded = await attachmentsService.upload(patientId, file, 'xray', branchId ?? undefined);
      setAttachments((prev) => [uploaded, ...prev]);
      Alert.alert('Uploaded', `${asset.fileName ?? 'X-ray'} uploaded successfully.`);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Upload failed.';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploadingType(null);
    }
  };

  const pickAndUploadDoc = async (type: 'report' | 'document') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to your photo library to upload.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName ?? `${type}-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      };
      setUploadingType(type);
      const uploaded = await attachmentsService.upload(patientId, file, type, branchId ?? undefined);
      setAttachments((prev) => [uploaded, ...prev]);
      Alert.alert('Uploaded', `${file.name} uploaded successfully.`);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Upload failed.';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteAttachment = (att: Attachment) => {
    Alert.alert(
      'Delete attachment?',
      `Permanently delete "${att.original_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await attachmentsService.delete(att.id);
              setAttachments((prev) => prev.filter((a) => a.id !== att.id));
              setViewerAttachment(null);
            } catch (err) {
              Alert.alert('Delete failed', (err as { message?: string })?.message ?? 'Try again.');
            }
          },
        },
      ],
    );
  };

  // ── Add condition ──────────────────────────────────────────────────────────
  const handleSaveCondition = async (cond: ToothCondition, sev: ToothSeverity | null, surfaceId: string | null, notes: string) => {
    if (!activeFdi) return;
    const tooth = allTeeth.find((t) => t.fdi_number === activeFdi);
    if (!tooth) {
      Alert.alert('Tooth not found', 'Could not match that tooth in the reference data.');
      return;
    }
    if (!branchId) {
      Alert.alert('Branch missing', 'No branch set on session.');
      return;
    }
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

  const handleDeleteCondition = async (id: string) => {
    Alert.alert(
      'Remove condition?',
      'This will delete the condition from the tooth.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await teethService.deleteCondition(id);
              setConditions((prev) => prev.filter((c) => c.id !== id));
            } catch (err) {
              Alert.alert('Delete failed', (err as { message?: string })?.message ?? 'Try again.');
            }
          },
        },
      ],
    );
  };

  // ── Open file in browser ───────────────────────────────────────────────────
  const openFileInBrowser = async (att: Attachment) => {
    const url = attachmentsService.getFileUrl(att.id);
    if (!url) {
      Alert.alert('Unable to open', 'Session expired. Please re-login.');
      return;
    }
    await Linking.openURL(url);
  };

  if (loading) {
    return <SkeletonList count={3} />;
  }

  return (
    <View style={{ gap: 16 }}>
      {/* ── Mini dental chart card ── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.cardHeadLeft}>
            <Ionicons name="grid" size={18} color="#4361EE" />
            <Text style={s.cardTitle}>Dental Chart</Text>
          </View>
          <TouchableOpacity style={s.fullBtn} onPress={onOpenFullChart}>
            <Ionicons name="expand" size={13} color="#4361EE" />
            <Text style={s.fullBtnTxt}>Open Full</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statTile}>
            <Text style={s.statNum}>{affectedTeeth}</Text>
            <Text style={s.statLbl}>Affected</Text>
          </View>
          <View style={s.statTile}>
            <Text style={s.statNum}>{conditions.length}</Text>
            <Text style={s.statLbl}>Conditions</Text>
          </View>
          <View style={[s.statTile, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[s.statNum, { color: '#15803D' }]}>{Math.max(0, 32 - affectedTeeth)}</Text>
            <Text style={[s.statLbl, { color: '#166534' }]}>Healthy</Text>
          </View>
        </View>

        {/* Mini chart — 4 quadrants */}
        <MiniChart
          conditionsByTooth={conditionsByTooth}
          activeFdi={activeFdi}
          onToothTap={(fdi) => setActiveFdi(fdi)}
        />

        {/* Selected tooth details */}
        {activeFdi && (
          <ToothDetailPanel
            fdi={activeFdi}
            conditions={conditionsByTooth.get(activeFdi) ?? []}
            tooth={allTeeth.find((t) => t.fdi_number === activeFdi) ?? null}
            onAdd={() => setAddDialogOpen(true)}
            onRemove={handleDeleteCondition}
            onClose={() => setActiveFdi(null)}
          />
        )}

        {/* Legend */}
        <ConditionLegend />
      </View>

      {/* ── X-rays Gallery ── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.cardHeadLeft}>
            <Ionicons name="scan" size={18} color="#0369A1" />
            <Text style={s.cardTitle}>X-rays</Text>
            {xrays.length > 0 && (
              <View style={s.countDot}>
                <Text style={s.countDotTxt}>{xrays.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[s.uploadBtn, uploadingType === 'xray' && { opacity: 0.6 }]}
            onPress={pickAndUploadXray}
            disabled={uploadingType !== null}
          >
            {uploadingType === 'xray'
              ? <ActivityIndicator size="small" color="#fff" />
              : (
                <>
                  <Ionicons name="cloud-upload" size={13} color="#fff" />
                  <Text style={s.uploadBtnTxt}>Upload X-ray</Text>
                </>
              )}
          </TouchableOpacity>
        </View>

        {xrays.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="scan-outline" size={28} color="#94a3b8" />
            <Text style={s.emptyTitle}>No X-rays yet</Text>
            <Text style={s.emptySub}>Tap Upload X-ray to add the first image.</Text>
          </View>
        ) : (
          <View style={s.xrayGrid}>
            {xrays.map((x) => (
              <XrayThumbnail
                key={x.id}
                attachment={x}
                onPress={() => setViewerAttachment(x)}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Reports & Documents ── */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.cardHeadLeft}>
            <Ionicons name="document-text" size={18} color="#7C3AED" />
            <Text style={s.cardTitle}>Reports & Documents</Text>
            {reports.length > 0 && (
              <View style={s.countDot}>
                <Text style={s.countDotTxt}>{reports.length}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[s.uploadBtnGhost, uploadingType === 'report' && { opacity: 0.6 }]}
              onPress={() => pickAndUploadDoc('report')}
              disabled={uploadingType !== null}
            >
              {uploadingType === 'report'
                ? <ActivityIndicator size="small" color="#4361EE" />
                : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={13} color="#4361EE" />
                    <Text style={s.uploadBtnGhostTxt}>Report</Text>
                  </>
                )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.uploadBtnGhost, uploadingType === 'document' && { opacity: 0.6 }]}
              onPress={() => pickAndUploadDoc('document')}
              disabled={uploadingType !== null}
            >
              {uploadingType === 'document'
                ? <ActivityIndicator size="small" color="#4361EE" />
                : (
                  <>
                    <Ionicons name="document-attach-outline" size={13} color="#4361EE" />
                    <Text style={s.uploadBtnGhostTxt}>Doc</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>
        </View>

        {reports.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={28} color="#94a3b8" />
            <Text style={s.emptyTitle}>No reports or documents</Text>
            <Text style={s.emptySub}>Upload PDFs or images for this patient.</Text>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {reports.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={s.docRow}
                activeOpacity={0.7}
                onPress={() => openFileInBrowser(r)}
              >
                <View style={s.docIcon}>
                  <Ionicons
                    name={r.mime_type?.startsWith('image/') ? 'image' : 'document'}
                    size={18}
                    color="#7C3AED"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.docName} numberOfLines={1}>{r.original_name}</Text>
                  <Text style={s.docMeta}>
                    {formatDate(r.created_at)}{r.uploader?.name ? ` · ${r.uploader.name}` : ''}
                  </Text>
                </View>
                <View style={[s.typeBadge, { backgroundColor: r.type === 'report' ? '#FEF3C7' : '#F1F5F9' }]}>
                  <Text style={[s.typeBadgeTxt, { color: r.type === 'report' ? '#B45309' : '#475569' }]}>
                    {r.type}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteAttachment(r)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Add condition dialog */}
      <AddConditionDialog
        visible={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        surfaces={surfaces}
        toothFdi={activeFdi}
        onSave={handleSaveCondition}
      />

      {/* X-ray viewer */}
      <XrayViewer
        attachment={viewerAttachment}
        onClose={() => setViewerAttachment(null)}
        onDelete={handleDeleteAttachment}
        onRequestAnalysis={async (att) => {
          // Trigger AI analysis
          const result = await attachmentsService.analyzeXray(att.id);
          if (result) {
            setAttachments((prev) =>
              prev.map((a) => a.id === att.id ? { ...a, ai_analysis: result } : a),
            );
            setViewerAttachment((cur) => cur && cur.id === att.id ? { ...cur, ai_analysis: result } : cur);
            Alert.alert('AI Analysis ready', 'Findings have been added to the X-ray.');
          } else {
            Alert.alert('Analysis failed', 'Could not generate AI findings. Try again.');
          }
        }}
      />
    </View>
  );
}

// ─── Mini Chart (touchable, 4 quadrants) ─────────────────────────────────────
function MiniChart({
  conditionsByTooth, activeFdi, onToothTap,
}: {
  conditionsByTooth: Map<string, PatientToothCondition[]>;
  activeFdi: string | null;
  onToothTap: (fdi: string) => void;
}) {
  return (
    <View style={s.chartWrap}>
      <View style={s.chartLabels}>
        <Text style={s.chartLabelTxt}>Right</Text>
        <Text style={s.chartLabelTxt}>Left</Text>
      </View>

      {/* Upper jaw */}
      <View style={s.jaw}>
        <View style={s.quadrant}>
          {UPPER_RIGHT.map((fdi) => (
            <ToothCell
              key={fdi}
              fdi={fdi}
              conditions={conditionsByTooth.get(fdi) ?? []}
              onPress={() => onToothTap(fdi)}
              highlighted={activeFdi === fdi}
            />
          ))}
        </View>
        <View style={s.midline} />
        <View style={s.quadrant}>
          {UPPER_LEFT.map((fdi) => (
            <ToothCell
              key={fdi}
              fdi={fdi}
              conditions={conditionsByTooth.get(fdi) ?? []}
              onPress={() => onToothTap(fdi)}
              highlighted={activeFdi === fdi}
            />
          ))}
        </View>
      </View>

      {/* Jaw separator */}
      <View style={s.jawSeparator} />

      {/* Lower jaw */}
      <View style={s.jaw}>
        <View style={s.quadrant}>
          {LOWER_RIGHT.map((fdi) => (
            <ToothCell
              key={fdi}
              fdi={fdi}
              conditions={conditionsByTooth.get(fdi) ?? []}
              onPress={() => onToothTap(fdi)}
              highlighted={activeFdi === fdi}
            />
          ))}
        </View>
        <View style={s.midline} />
        <View style={s.quadrant}>
          {LOWER_LEFT.map((fdi) => (
            <ToothCell
              key={fdi}
              fdi={fdi}
              conditions={conditionsByTooth.get(fdi) ?? []}
              onPress={() => onToothTap(fdi)}
              highlighted={activeFdi === fdi}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Tooth Detail Panel ─────────────────────────────────────────────────────
function ToothDetailPanel({
  fdi, conditions, tooth, onAdd, onRemove, onClose,
}: {
  fdi: string;
  conditions: PatientToothCondition[];
  tooth: Tooth | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <View style={s.detailPanel}>
      <View style={s.detailHead}>
        <View>
          <Text style={s.detailTitle}>Tooth #{fdi}</Text>
          {tooth?.name && <Text style={s.detailSub}>{tooth.name}</Text>}
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {conditions.length === 0 ? (
        <Text style={s.detailEmpty}>No conditions recorded for this tooth.</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {conditions.map((c) => {
            const color = CONDITION_COLOR[c.condition] ?? '#94a3b8';
            const sev = c.severity ? SEVERITY_COLOR[c.severity] : null;
            return (
              <View key={c.id} style={s.condRow}>
                <View style={[s.condDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                <TouchableOpacity onPress={() => onRemove(c.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={15} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={s.addCondBtn} onPress={onAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={14} color="#fff" />
        <Text style={s.addCondBtnTxt}>Add Condition</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Condition Legend ───────────────────────────────────────────────────────
function ConditionLegend() {
  return (
    <View style={s.legendWrap}>
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
  );
}

// ─── X-ray Thumbnail ────────────────────────────────────────────────────────
function XrayThumbnail({ attachment, onPress }: { attachment: Attachment; onPress: () => void }) {
  const uri = attachmentsService.getFileUrl(attachment.id);
  return (
    <TouchableOpacity style={s.xrayCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.xrayImgBox}>
        {uri ? (
          <Image source={{ uri }} style={s.xrayImg} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={32} color="#94a3b8" />
        )}
        {attachment.ai_analysis && (
          <View style={s.aiBadge}>
            <Ionicons name="sparkles" size={9} color="#fff" />
            <Text style={s.aiBadgeTxt}>AI</Text>
          </View>
        )}
      </View>
      <Text style={s.xrayName} numberOfLines={1}>{attachment.original_name}</Text>
      <Text style={s.xrayDate}>{formatDate(attachment.created_at)}</Text>
    </TouchableOpacity>
  );
}

// ─── X-ray Viewer (full-screen modal) ───────────────────────────────────────
function XrayViewer({
  attachment, onClose, onDelete, onRequestAnalysis,
}: {
  attachment: Attachment | null;
  onClose: () => void;
  onDelete: (a: Attachment) => void;
  onRequestAnalysis: (a: Attachment) => Promise<void>;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  if (!attachment) return null;
  const uri = attachmentsService.getFileUrl(attachment.id);
  const analysis = attachment.ai_analysis;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try { await onRequestAnalysis(attachment); }
    finally { setAnalyzing(false); }
  };

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={vs.root}>
        <View style={vs.header}>
          <TouchableOpacity onPress={onClose} style={vs.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={vs.title} numberOfLines={1}>{attachment.original_name}</Text>
            <Text style={vs.sub}>{formatDate(attachment.created_at)}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(attachment)} style={vs.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* Image with pinch-zoom + pan + double-tap to zoom */}
          {uri && (
            <View style={vs.imageWrap}>
              <ZoomableImage
                uri={uri}
                aspectRatio={1}
                overlay={
                  <>
                    {analysis?.findings?.map((f) => f.region && (
                      <View
                        key={f.id}
                        style={{
                          position: 'absolute',
                          left: `${f.region.x * 100}%`,
                          top: `${f.region.y * 100}%`,
                          width: `${f.region.width * 100}%`,
                          height: `${f.region.height * 100}%`,
                          borderWidth: 2,
                          borderColor:
                            f.severity === 'severe' ? '#ef4444'
                            : f.severity === 'moderate' ? '#f59e0b'
                            : f.severity === 'mild' ? '#3b82f6'
                            : '#22c55e',
                          backgroundColor:
                            f.severity === 'severe' ? 'rgba(239,68,68,0.25)'
                            : f.severity === 'moderate' ? 'rgba(245,158,11,0.25)'
                            : f.severity === 'mild' ? 'rgba(59,130,246,0.25)'
                            : 'rgba(34,197,94,0.20)',
                          borderRadius: 4,
                        }}
                      />
                    ))}
                  </>
                }
              />
              <Text style={vs.zoomHint}>Pinch to zoom · Double-tap to toggle</Text>
            </View>
          )}

          {/* AI Analysis */}
          {!analysis ? (
            <TouchableOpacity style={vs.analyzeBtn} onPress={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={15} color="#fff" />
                  <Text style={vs.analyzeBtnTxt}>Run AI Analysis</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={vs.analysisCard}>
                <View style={vs.analysisHead}>
                  <Ionicons name="sparkles" size={16} color="#4361EE" />
                  <Text style={vs.analysisTitle}>AI Analysis</Text>
                </View>
                {!!analysis.summary && (
                  <Text style={vs.analysisSummary}>{analysis.summary}</Text>
                )}
                <View style={vs.metaTags}>
                  {!!analysis.image_quality && (
                    <View style={vs.metaPill}>
                      <Text style={vs.metaPillTxt}>Quality: {analysis.image_quality}</Text>
                    </View>
                  )}
                  {!!analysis.image_type && (
                    <View style={vs.metaPill}>
                      <Text style={vs.metaPillTxt}>Type: {analysis.image_type}</Text>
                    </View>
                  )}
                </View>
                {!!analysis.teeth_identified?.length && (
                  <View>
                    <Text style={vs.subLabel}>Teeth identified</Text>
                    <View style={vs.toothChips}>
                      {analysis.teeth_identified.map((t) => (
                        <View key={t} style={vs.toothChip}>
                          <Text style={vs.toothChipTxt}>#{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Findings */}
              {!!analysis.findings?.length && (
                <View style={vs.analysisCard}>
                  <Text style={vs.analysisTitle}>Findings ({analysis.findings.length})</Text>
                  {analysis.findings.map((f) => {
                    const sev = SEVERITY_COLOR[f.severity] ?? { bg: '#F1F5F9', text: '#475569' };
                    return (
                      <View key={f.id} style={vs.findingRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={vs.findingName}>{f.finding}</Text>
                          {!!f.location && <Text style={vs.findingMeta}>{f.location}</Text>}
                        </View>
                        <View style={[vs.sevPill, { backgroundColor: sev.bg }]}>
                          <Text style={[vs.sevPillTxt, { color: sev.text }]}>{f.severity}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Recommendations */}
              {!!analysis.recommendations?.length && (
                <View style={vs.analysisCard}>
                  <Text style={vs.analysisTitle}>Recommendations</Text>
                  {analysis.recommendations.map((r, i) => (
                    <View key={i} style={vs.bulletRow}>
                      <View style={vs.bullet} />
                      <Text style={vs.bulletTxt}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}

              {!!analysis.risk_areas?.length && (
                <View style={vs.analysisCard}>
                  <Text style={vs.analysisTitle}>Risk Areas</Text>
                  {analysis.risk_areas.map((r, i) => (
                    <View key={i} style={vs.riskRow}>
                      <View
                        style={[
                          vs.priorityDot,
                          { backgroundColor:
                            r.priority === 'high' ? '#DC2626'
                            : r.priority === 'medium' ? '#B45309'
                            : '#15803D' },
                        ]}
                      />
                      <Text style={vs.bulletTxt}>{r.area}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={vs.disclaimer}>
                AI-assisted analysis for reference only. Clinical judgment required.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Add Condition Dialog ───────────────────────────────────────────────────
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
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState<null | 'condition' | 'severity' | 'surface'>(null);

  useEffect(() => {
    if (visible) {
      setCondition('Cavity');
      setSeverity(null);
      setSurfaceId(null);
      setNotes('');
    }
  }, [visible]);

  const surfaceName = surfaces.find((s2) => s2.id === surfaceId)?.name ?? null;

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

          <Text style={[ds.label, { marginTop: 10 }]}>Notes</Text>
          <Pressable style={[ds.field, { minHeight: 70 }]}>
            <Text style={[ds.fieldTxt, !notes && { color: '#94a3b8' }]} numberOfLines={3}>
              {notes ||
                'Tap to add notes (use device prompt)'}
            </Text>
          </Pressable>

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

          {/* Sub-pickers */}
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
            options={surfaces.map((surf) => `${surf.name} (${surf.code})`)}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  countDot: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  countDotTxt: { fontSize: 11, fontWeight: '700', color: '#475569' },

  fullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  fullBtnTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statTile: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10,
    alignItems: 'center', gap: 2,
  },
  statNum: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  statLbl: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.3 },

  // Chart layout
  chartWrap: { gap: 6 },
  chartLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  chartLabelTxt: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 },
  jaw: { flexDirection: 'row', alignItems: 'center' },
  quadrant: { flex: 1, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 3 },
  midline: { width: 1, height: 26, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
  jawSeparator: { height: 6 },

  tooth: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  toothFdi: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  toothBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#4361EE',
    alignItems: 'center', justifyContent: 'center',
  },
  toothBadgeTxt: { fontSize: 7, fontWeight: '800', color: '#fff' },

  // Detail panel
  detailPanel: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  detailHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  detailTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  detailSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  detailEmpty: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 6 },

  condRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#fff', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  condDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  condName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  condSurface: { fontSize: 11, color: '#64748b' },
  sevPill: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 },
  sevPillTxt: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  condNotes: { fontSize: 12, color: '#475569', marginTop: 3 },
  condMeta: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  addCondBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#4361EE', paddingVertical: 9, borderRadius: 10,
  },
  addCondBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Legend
  legendWrap: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  legendTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 6 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { fontSize: 10, color: '#475569' },

  // Upload
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#4361EE',
  },
  uploadBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  uploadBtnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  uploadBtnGhostTxt: { fontSize: 11, fontWeight: '700', color: '#4361EE' },

  // X-ray grid
  xrayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  xrayCard: { width: '48%', gap: 4 },
  xrayImgBox: {
    width: '100%', aspectRatio: 1, borderRadius: 10,
    backgroundColor: '#0f172a', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  xrayImg: { width: '100%', height: '100%' },
  aiBadge: {
    position: 'absolute', top: 5, right: 5,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#7C3AED', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeTxt: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  xrayName: { fontSize: 11, fontWeight: '600', color: '#0f172a' },
  xrayDate: { fontSize: 10, color: '#94a3b8' },

  // Reports
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  docIcon: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
  },
  docName: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  docMeta: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeBadgeTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  // Empty state inside cards
  empty: {
    backgroundColor: '#F8FAFC', borderRadius: 10, paddingVertical: 20, gap: 4,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 11, color: '#64748b' },
});

// ─── Viewer styles ──────────────────────────────────────────────────────────
const vs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingTop: 50, paddingBottom: 10,
    backgroundColor: '#020617',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 11, color: '#94a3b8' },

  imageWrap: {
    width: '100%', backgroundColor: '#020617',
    borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  zoomHint: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },

  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7C3AED', paddingVertical: 13, borderRadius: 12,
  },
  analyzeBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  analysisCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 12, gap: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  analysisHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  analysisTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  analysisSummary: { fontSize: 12, color: '#cbd5e1', lineHeight: 18 },

  metaTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaPill: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  metaPillTxt: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  subLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.3, marginBottom: 4 },
  toothChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  toothChip: { backgroundColor: '#4361EE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  toothChipTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

  findingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  findingName: { fontSize: 12, color: '#fff', fontWeight: '600' },
  findingMeta: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  sevPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sevPillTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94a3b8', marginTop: 7 },
  bulletTxt: { flex: 1, fontSize: 12, color: '#cbd5e1', lineHeight: 17 },

  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },

  disclaimer: { fontSize: 10, color: '#64748b', textAlign: 'center', fontStyle: 'italic' },
});

// ─── Add Condition dialog styles ────────────────────────────────────────────
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
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

// ─── Picker styles ─────────────────────────────────────────────────────────
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
