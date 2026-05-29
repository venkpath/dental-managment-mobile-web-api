import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import SignatureCanvas from 'react-native-signature-canvas';

import { consentsService } from '../../services/consents.service';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'SignConsent'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

// Inject CSS to style the signature canvas
const SIGNATURE_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; background: #fff; }
  .m-signature-pad--body { border: 2px dashed #C7D2FE; border-radius: 12px; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { background: transparent; height: 100%; }
`;

export default function SignConsentScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { consentId, consentTitle, defaultName } = route.params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signatureRef = useRef<any>(null);

  const [name, setName] = useState(defaultName ?? '');
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setHasSignature(false);
    setSignatureData(null);
  };

  const handleOK = (b64: string) => {
    // base64 PNG data URL from canvas
    setSignatureData(b64);
  };

  const handleEmpty = () => {
    Alert.alert('Empty signature', 'Please draw your signature before saving.');
  };

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      Alert.alert('Name required', 'Please type your name to sign.');
      return;
    }
    // Trigger the canvas to emit the signature (which calls handleOK)
    signatureRef.current?.readSignature();
    // Then submit happens in a useEffect-like sequence
    setSubmitting(true);
  };

  // When signatureData becomes available, send to server
  React.useEffect(() => {
    if (!submitting || !signatureData) return;
    (async () => {
      try {
        await consentsService.signDigital(consentId, {
          signed_by_name: name.trim(),
          signature_data_url: signatureData,
        });
        Alert.alert('Signed', 'Consent saved successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (err) {
        Alert.alert('Save failed', (err as { message?: string })?.message ?? 'Try again.');
      } finally {
        setSubmitting(false);
        setSignatureData(null);
      }
    })();
  }, [submitting, signatureData, consentId, name, navigation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top, backgroundColor: '#F8FAFC' }}>
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.topTitle}>Sign Consent</Text>
            {consentTitle && <Text style={s.topSub} numberOfLines={1}>{consentTitle}</Text>}
          </View>
        </View>
      </View>

      <View style={{ flex: 1, padding: 16, gap: 12, paddingBottom: bottomInset }}>
        {/* Name */}
        <View>
          <Text style={s.label}>Signed By *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Patient's full name"
            placeholderTextColor="#94a3b8"
            style={s.input}
          />
        </View>

        {/* Signature canvas */}
        <View style={{ flex: 1 }}>
          <View style={s.canvasHead}>
            <Text style={s.label}>Signature *</Text>
            {hasSignature && (
              <TouchableOpacity onPress={handleClear} hitSlop={8}>
                <Text style={s.clearTxt}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.canvasWrap}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleOK}
              onEmpty={handleEmpty}
              onBegin={() => setHasSignature(true)}
              webStyle={SIGNATURE_STYLE}
              backgroundColor="rgba(255,255,255,0)"
              imageType="image/png"
              descriptionText=""
            />
          </View>
          <Text style={s.helperTxt}>Draw your signature above with your finger.</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.saveBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.saveTxt}>Save Signed Consent</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  topTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  topSub: { fontSize: 11, color: '#64748b', marginTop: 1 },

  label: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a',
  },

  canvasHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearTxt: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  canvasWrap: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    overflow: 'hidden', minHeight: 240,
  },
  helperTxt: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#4361EE', paddingVertical: 14, borderRadius: 12,
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
