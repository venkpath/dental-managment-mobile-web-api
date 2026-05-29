import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aiService, type ChartAnalysisResponse } from '../../../services/ai.service';

function riskTheme(level?: string) {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return { bg: '#FEE2E2', text: '#991B1B', label: 'CRITICAL' };
    case 'high':     return { bg: '#FED7AA', text: '#9A3412', label: 'HIGH' };
    case 'moderate': return { bg: '#FEF3C7', text: '#B45309', label: 'MODERATE' };
    default:         return { bg: '#DCFCE7', text: '#15803D', label: 'LOW' };
  }
}

function quadrantTheme(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'critical':  return { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' };
    case 'at_risk':   return { bg: '#FED7AA', text: '#9A3412', dot: '#EA580C' };
    case 'attention': return { bg: '#FEF3C7', text: '#B45309', dot: '#D97706' };
    default:          return { bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' };
  }
}

function quadrantLabel(q?: string) {
  switch (q) {
    case 'UR': return 'Upper Right';
    case 'UL': return 'Upper Left';
    case 'LR': return 'Lower Right';
    case 'LL': return 'Lower Left';
    default:   return q ?? '';
  }
}

function severityTheme(level?: string) {
  switch ((level ?? '').toLowerCase()) {
    case 'high':   return { bg: '#FEE2E2', text: '#DC2626' };
    case 'medium': return { bg: '#FED7AA', text: '#9A3412' };
    default:       return { bg: '#DCFCE7', text: '#15803D' };
  }
}

export function ChartAnalysisPanel({ patientId }: { patientId: string }) {
  const [analysis, setAnalysis] = useState<ChartAnalysisResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await aiService.generateChartAnalysis(patientId);
      setAnalysis(r);
    } catch (err) {
      Alert.alert('Analysis failed', (err as { message?: string })?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!analysis) {
    return (
      <View style={s.card}>
        <View style={s.head}>
          <View style={[s.headIcon, { backgroundColor: '#F3E8FF' }]}>
            <Ionicons name="sparkles" size={18} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>AI Risk Analysis</Text>
            <Text style={s.sub}>Score the chart, spot risks, plan the next visit</Text>
          </View>
        </View>
        <TouchableOpacity style={[s.runBtn, busy && { opacity: 0.6 }]} onPress={run} disabled={busy}>
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color="#fff" />
              <Text style={s.runBtnTxt}>Run AI Analysis</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const risk = riskTheme(analysis.overall_risk);
  const score = analysis.oral_health_score ?? 0;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={[s.headIcon, { backgroundColor: '#F3E8FF' }]}>
          <Ionicons name="sparkles" size={18} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>AI Risk Analysis</Text>
          <Text style={s.sub}>
            Generated {new Date(analysis.generated_at).toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity onPress={run} hitSlop={8} disabled={busy}>
          {busy ? <ActivityIndicator size="small" color="#7C3AED" /> : <Ionicons name="refresh" size={16} color="#7C3AED" />}
        </TouchableOpacity>
      </View>

      {/* Score + risk row */}
      <View style={s.scoreRow}>
        <View style={s.scoreBlock}>
          <Text style={s.scoreNum}>{score}</Text>
          <Text style={s.scoreLbl}>Health Score</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[s.riskPill, { backgroundColor: risk.bg, alignSelf: 'flex-start' }]}>
            <Text style={[s.riskTxt, { color: risk.text }]}>{risk.label} RISK</Text>
          </View>
          {!!analysis.summary && (
            <Text style={s.summary} numberOfLines={4}>{analysis.summary}</Text>
          )}
        </View>
      </View>

      {/* Quadrants */}
      {!!analysis.quadrant_analysis?.length && (
        <View>
          <Text style={s.sectionLbl}>By Quadrant</Text>
          <View style={s.quadGrid}>
            {analysis.quadrant_analysis.map((q) => {
              const th = quadrantTheme(q.status);
              return (
                <View key={q.quadrant} style={[s.quadCell, { backgroundColor: th.bg }]}>
                  <View style={[s.quadDot, { backgroundColor: th.dot }]} />
                  <Text style={[s.quadName, { color: th.text }]}>{quadrantLabel(q.quadrant)}</Text>
                  <Text style={[s.quadCond, { color: th.text }]}>
                    {q.conditions} cond{q.conditions === 1 ? '' : 's'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Immediate attention */}
      {!!analysis.immediate_attention?.length && (
        <View style={s.warnBox}>
          <View style={s.warnHead}>
            <Ionicons name="warning" size={14} color="#DC2626" />
            <Text style={s.warnTitle}>Immediate Attention</Text>
          </View>
          {analysis.immediate_attention.map((m, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.warnBullet} />
              <Text style={s.warnTxt}>{m}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Risk factors */}
      {!!analysis.risk_factors?.length && (
        <View>
          <Text style={s.sectionLbl}>Risk Factors</Text>
          {analysis.risk_factors.map((r, i) => {
            const sev = severityTheme(r.severity);
            return (
              <View key={i} style={s.factorCard}>
                <View style={s.factorHead}>
                  <Text style={s.factorName}>{r.factor}</Text>
                  <View style={[s.sevPill, { backgroundColor: sev.bg }]}>
                    <Text style={[s.sevTxt, { color: sev.text }]}>{r.severity}</Text>
                  </View>
                </View>
                {!!r.affected_teeth?.length && (
                  <View style={s.teethChips}>
                    {r.affected_teeth.map((t) => (
                      <View key={t} style={s.toothChip}>
                        <Text style={s.toothChipTxt}>#{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {!!r.recommendation && <Text style={s.recTxt}>{r.recommendation}</Text>}
              </View>
            );
          })}
        </View>
      )}

      {/* Preventive */}
      {!!analysis.preventive_alerts?.length && (
        <View>
          <Text style={s.sectionLbl}>Preventive Alerts</Text>
          {analysis.preventive_alerts.map((p, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bullet} />
              <Text style={s.bulletTxt}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {!!analysis.next_visit_focus && (
        <View style={s.focusBox}>
          <View style={s.focusHead}>
            <Ionicons name="bookmark" size={13} color="#4361EE" />
            <Text style={s.focusLbl}>Next Visit Focus</Text>
          </View>
          <Text style={s.focusTxt}>{analysis.next_visit_focus}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 11, color: '#64748b', marginTop: 1 },

  runBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7C3AED', paddingVertical: 11, borderRadius: 10,
  },
  runBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  scoreRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  scoreBlock: {
    width: 84, height: 84, borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 28, fontWeight: '800', color: '#7C3AED', lineHeight: 30 },
  scoreLbl: { fontSize: 9, fontWeight: '700', color: '#7C3AED', letterSpacing: 0.4 },
  riskPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  riskTxt: { fontSize: 10, fontWeight: '800' },
  summary: { fontSize: 12, color: '#475569', lineHeight: 17 },

  sectionLbl: {
    fontSize: 11, fontWeight: '800', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
  },

  quadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quadCell: {
    width: '48%', borderRadius: 10, padding: 10, gap: 4,
  },
  quadDot: { width: 8, height: 8, borderRadius: 4 },
  quadName: { fontSize: 12, fontWeight: '700' },
  quadCond: { fontSize: 10, fontWeight: '600' },

  warnBox: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, gap: 5,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  warnTitle: { fontSize: 12, fontWeight: '800', color: '#991B1B' },
  warnBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DC2626', marginTop: 7 },
  warnTxt: { flex: 1, fontSize: 12, color: '#991B1B', lineHeight: 17 },

  factorCard: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 6,
  },
  factorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  factorName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' },
  sevPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  sevTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  teethChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  toothChip: { backgroundColor: '#4361EE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  toothChipTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },
  recTxt: { fontSize: 11, color: '#475569', lineHeight: 16 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 2 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94a3b8', marginTop: 7 },
  bulletTxt: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 17 },

  focusBox: {
    backgroundColor: '#EEF2FF', borderRadius: 10, padding: 10, gap: 4,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  focusHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  focusLbl: { fontSize: 11, fontWeight: '800', color: '#4361EE' },
  focusTxt: { fontSize: 12, color: '#0f172a', lineHeight: 17 },
});
