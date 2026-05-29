import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { consentsService, type ConsentTemplate } from '../../services/consents.service';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'NewConsent'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

export default function NewConsentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { patientId } = route.params;

  const [languages, setLanguages] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>('en');
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [procedure, setProcedure] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [tplPickerOpen, setTplPickerOpen] = useState(false);
  const [loadingTpls, setLoadingTpls] = useState(false);

  useEffect(() => {
    consentsService.listLanguages().then((langs) => {
      const list = langs.length > 0 ? langs : ['en'];
      setLanguages(list);
      setLanguage(list[0]);
    });
  }, []);

  useEffect(() => {
    if (!language) return;
    setLoadingTpls(true);
    setTemplateId(null);
    consentsService.listTemplates(language)
      .then(setTemplates)
      .finally(() => setLoadingTpls(false));
  }, [language]);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const handleSubmit = async () => {
    if (!templateId) {
      Alert.alert('Template required', 'Pick a consent template.');
      return;
    }
    setSubmitting(true);
    try {
      await consentsService.create(patientId, {
        template_id: templateId,
        procedure: procedure.trim() || undefined,
      });
      Alert.alert('Consent generated', 'The consent form is ready to sign.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Failed', (err as { message?: string })?.message ?? 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top }}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={s.title}>New Consent</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 + bottomInset }}>
        <View style={s.card}>
          <Text style={s.label}>Language *</Text>
          <TouchableOpacity style={s.field} onPress={() => setLangPickerOpen(true)}>
            <Text style={s.fieldTxt}>{language.toUpperCase()}</Text>
            <Ionicons name="chevron-down" size={14} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={[s.label, { marginTop: 12 }]}>Template *</Text>
          {loadingTpls ? (
            <View style={s.field}>
              <ActivityIndicator size="small" color="#4361EE" />
              <Text style={[s.fieldTxt, { color: '#94a3b8' }]}>Loading templates…</Text>
            </View>
          ) : templates.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTxt}>
                No templates available for this language. Add some in Settings → Consent Forms.
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={s.field} onPress={() => setTplPickerOpen(true)}>
              <Text style={[s.fieldTxt, !selectedTemplate && { color: '#94a3b8' }]} numberOfLines={1}>
                {selectedTemplate?.title ?? '— Pick a template —'}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <Text style={[s.label, { marginTop: 12 }]}>Procedure (optional)</Text>
          <TextInput
            value={procedure}
            onChangeText={setProcedure}
            placeholder="e.g. Extraction of upper right wisdom tooth (#18)"
            placeholderTextColor="#94a3b8"
            multiline
            style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
          />
          <Text style={s.helperTxt}>Inserted into the procedure clause of the form.</Text>
        </View>
      </ScrollView>

      <View style={[s.actionBar, { paddingBottom: 12 + bottomInset }]}>
        <TouchableOpacity
          style={[s.saveBtn, (!templateId || submitting) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={!templateId || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text" size={15} color="#fff" />
              <Text style={s.saveTxt}>Generate Consent</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Language picker */}
      <SimplePicker
        visible={langPickerOpen}
        title="Language"
        options={languages.map((l) => ({ id: l, label: l.toUpperCase() }))}
        value={language}
        onSelect={setLanguage}
        onClose={() => setLangPickerOpen(false)}
      />

      {/* Template picker */}
      <SimplePicker
        visible={tplPickerOpen}
        title="Template"
        options={templates.map((t) => ({ id: t.id, label: t.title }))}
        value={templateId ?? ''}
        onSelect={setTemplateId}
        onClose={() => setTplPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function SimplePicker({
  visible, title, options, value, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onSelect: (id: string) => void;
  onClose: () => void;
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
          <ScrollView style={{ maxHeight: 400 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[ps.item, value === opt.id && ps.itemActive]}
                onPress={() => { onSelect(opt.id); onClose(); }}
              >
                <Text style={[ps.itemTxt, value === opt.id && ps.itemTxtActive]}>{opt.label}</Text>
                {value === opt.id && <Ionicons name="checkmark" size={16} color="#4361EE" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
  },
  fieldTxt: { flex: 1, fontSize: 14, color: '#0f172a' },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingTop: 10, paddingVertical: 10,
    fontSize: 13, color: '#0f172a',
  },
  helperTxt: { fontSize: 11, color: '#94a3b8', marginTop: 5 },
  emptyBox: {
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  emptyTxt: { fontSize: 12, color: '#92400E', lineHeight: 17 },

  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingHorizontal: 16, paddingTop: 12,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4361EE', paddingVertical: 14, borderRadius: 12,
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  itemActive: { backgroundColor: '#EEF2FF' },
  itemTxt: { fontSize: 14, color: '#0f172a' },
  itemTxtActive: { color: '#4361EE', fontWeight: '700' },
});
