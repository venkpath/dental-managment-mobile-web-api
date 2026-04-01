import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import { whatsappService, WaTemplate } from '../../services/whatsapp.service';
import { colors, spacing, typography, radius } from '../../theme';
import type { Patient, WhatsAppStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<WhatsAppStackParamList>;

const WA_GREEN = '#25D366';
const WA_DARK = '#075E54';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function NewConversationScreen() {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState<'patient' | 'template'>('patient');
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WaTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  // Search patients
  const searchPatients = useCallback(
    async (text: string) => {
      setPatientSearch(text);
      if (text.length < 1) {
        setPatients([]);
        return;
      }
      setPatientsLoading(true);
      try {
        const res = await patientService.list(1, text);
        setPatients(res.data ?? []);
      } catch {
        // silent
      } finally {
        setPatientsLoading(false);
      }
    },
    [],
  );

  // Load templates when moving to step 2
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await whatsappService.getTemplates();
      setTemplates(
        (res.data ?? []).filter(
          (t) => t.whatsapp_template_status === 'approved' && t.is_active,
        ),
      );
    } catch {
      // silent
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setStep('template');
    loadTemplates();
  };

  const handleSelectTemplate = (template: WaTemplate) => {
    setSelectedTemplate(template);
    setVariables({});
  };

  // Parse template variables from body text
  const templateVars = useMemo(() => {
    if (!selectedTemplate) return [];
    if (selectedTemplate.variables && selectedTemplate.variables.length > 0) {
      return selectedTemplate.variables;
    }
    const matches = selectedTemplate.body.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))].sort(
      (a, b) => Number(a) - Number(b),
    );
  }, [selectedTemplate]);

  const handleSend = async () => {
    if (!selectedPatient || !selectedTemplate || sending) return;
    setSending(true);
    try {
      await whatsappService.startConversation({
        patient_id: selectedPatient.id,
        template_id: selectedTemplate.id,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
      });
      const name = `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim();
      Alert.alert('Success', `Template sent to ${name}`, [
        {
          text: 'Open Chat',
          onPress: () => {
            let phone = (selectedPatient.phone || '').replace(/[^0-9]/g, '');
            if (phone.length === 10) phone = '91' + phone;
            navigation.replace('ChatThread', {
              phone,
              name,
              patientId: selectedPatient.id,
            });
          },
        },
        {
          text: 'Back to Inbox',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const patientName = selectedPatient
    ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim()
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'template' && !selectedTemplate) {
              setStep('patient');
              setSelectedPatient(null);
            } else if (step === 'template' && selectedTemplate) {
              setSelectedTemplate(null);
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'patient' ? 'Select Patient' : 'Select Template'}
        </Text>
      </View>

      {/* Selected patient breadcrumb */}
      {selectedPatient && (
        <View style={styles.breadcrumb}>
          <View style={styles.breadcrumbAvatar}>
            <Text style={styles.breadcrumbAvatarText}>{getInitials(patientName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.breadcrumbName}>{patientName}</Text>
            <Text style={styles.breadcrumbPhone}>{selectedPatient.phone}</Text>
          </View>
          {step === 'template' && (
            <TouchableOpacity
              onPress={() => {
                setStep('patient');
                setSelectedPatient(null);
                setSelectedTemplate(null);
              }}
            >
              <Text style={styles.changeBtn}>Change</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step 1: Patient search */}
      {step === 'patient' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={colors.textMuted}
              value={patientSearch}
              onChangeText={searchPatients}
              autoFocus
            />
          </View>
          {patientsLoading ? (
            <View style={styles.centeredWrap}>
              <ActivityIndicator size="large" color={WA_GREEN} />
            </View>
          ) : patients.length === 0 ? (
            <View style={styles.centeredWrap}>
              <Text style={styles.emptyText}>
                {patientSearch ? 'No patients found.' : 'Type to search patients...'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={patients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const name = `${item.first_name || ''} ${item.last_name || ''}`.trim();
                return (
                  <TouchableOpacity
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPatient(item)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(name)}</Text>
                    </View>
                    <View>
                      <Text style={styles.itemName}>{name}</Text>
                      <Text style={styles.itemSub}>{item.phone}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Step 2: Template selection */}
      {step === 'template' && !selectedTemplate && (
        <View style={{ flex: 1 }}>
          {templatesLoading ? (
            <View style={styles.centeredWrap}>
              <ActivityIndicator size="large" color={WA_GREEN} />
            </View>
          ) : templates.length === 0 ? (
            <View style={styles.centeredWrap}>
              <Text style={{ fontSize: 40, opacity: 0.3, marginBottom: spacing.sm }}>📄</Text>
              <Text style={styles.emptyText}>No approved templates found.</Text>
              <Text style={[styles.emptyText, { marginTop: 4 }]}>
                Sync templates from the web dashboard first.
              </Text>
            </View>
          ) : (
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.templateItem}
                  activeOpacity={0.7}
                  onPress={() => handleSelectTemplate(item)}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateName}>{item.template_name}</Text>
                    <View style={styles.langBadge}>
                      <Text style={styles.langBadgeText}>{item.language || 'en'}</Text>
                    </View>
                  </View>
                  <Text style={styles.templateBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Step 3: Variables + send */}
      {step === 'template' && selectedTemplate && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.base }}>
          {/* Template preview */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{selectedTemplate.template_name}</Text>
              <TouchableOpacity onPress={() => setSelectedTemplate(null)}>
                <Text style={styles.changeBtn}>Change</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.previewBody}>{selectedTemplate.body}</Text>
          </View>

          {/* Variable inputs */}
          {templateVars.length > 0 && (
            <View style={{ marginTop: spacing.base }}>
              <Text style={styles.sectionTitle}>Template Variables</Text>
              {templateVars.map((varKey) => (
                <View key={varKey} style={styles.variableRow}>
                  <Text style={styles.variableLabel}>{`{{${varKey}}}`}</Text>
                  <TextInput
                    style={styles.variableInput}
                    placeholder={`Value for {{${varKey}}}`}
                    placeholderTextColor={colors.textMuted}
                    value={variables[varKey] || ''}
                    onChangeText={(text) =>
                      setVariables((prev) => ({ ...prev, [varKey]: text }))
                    }
                  />
                </View>
              ))}
            </View>
          )}

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Send Template</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },

  header: {
    backgroundColor: WA_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 28, color: '#fff', fontWeight: '700', lineHeight: 30 },
  headerTitle: { color: '#fff', fontSize: typography.md, fontWeight: '600' },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  breadcrumbAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WA_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbAvatarText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  breadcrumbName: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  breadcrumbPhone: { fontSize: typography.xs, color: colors.textSecondary },
  changeBtn: { color: WA_DARK, fontSize: typography.sm, fontWeight: '600' },

  searchWrap: { padding: spacing.sm },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.sm,
    color: colors.text,
  },

  centeredWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyText: { fontSize: typography.sm, color: colors.textMuted, textAlign: 'center' },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: WA_DARK, fontSize: typography.sm, fontWeight: '700' },
  itemName: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  itemSub: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },

  templateItem: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  templateName: { fontSize: typography.sm, fontWeight: '600', color: colors.text, flex: 1 },
  langBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  langBadgeText: { fontSize: 10, color: WA_DARK, fontWeight: '600' },
  templateBody: { fontSize: typography.xs, color: colors.textSecondary, lineHeight: 16 },

  previewCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.base,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  previewTitle: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  previewBody: { fontSize: typography.xs, color: colors.textSecondary, lineHeight: 18 },

  sectionTitle: { fontSize: typography.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm },
  variableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  variableLabel: { fontSize: typography.xs, color: colors.textMuted, width: 50 },
  variableInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sendBtn: {
    backgroundColor: WA_GREEN,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
