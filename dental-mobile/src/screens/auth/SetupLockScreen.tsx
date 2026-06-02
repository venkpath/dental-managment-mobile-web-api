import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PinPad from '../../components/PinPad';
import { PIN_LENGTH } from '../../services/deviceLock.service';
import { useDeviceLockStore } from '../../store/deviceLock.store';

type Step = 'choose' | 'confirm';

export default function SetupLockScreen() {
  const { biometricAvailable, biometricLabel, completeSetup } = useDeviceLockStore();
  const [step, setStep] = useState<Step>('choose');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [enableBio, setEnableBio] = useState(biometricAvailable);
  const [busy, setBusy] = useState(false);

  const activePin = step === 'choose' ? firstPin : pin;

  const onDigit = (digit: string) => {
    if (busy) return;
    const next = activePin + digit;
    if (step === 'choose') {
      setFirstPin(next);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => setStep('confirm'), 200);
      }
      return;
    }
    setPin(next);
    if (next.length === PIN_LENGTH) {
      finishSetup(next);
    }
  };

  const onBackspace = () => {
    if (busy) return;
    if (step === 'choose') setFirstPin((p) => p.slice(0, -1));
    else setPin((p) => p.slice(0, -1));
  };

  const finishSetup = async (confirm: string) => {
    if (confirm !== firstPin) {
      Alert.alert('PIN mismatch', 'Please try again.');
      setStep('choose');
      setFirstPin('');
      setPin('');
      return;
    }
    setBusy(true);
    try {
      await completeSetup(confirm, enableBio && biometricAvailable);
    } catch (e) {
      Alert.alert('Setup failed', e instanceof Error ? e.message : 'Could not save PIN.');
      setStep('choose');
      setFirstPin('');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const resetChoose = () => {
    setStep('choose');
    setFirstPin('');
    setPin('');
  };

  return (
    <View style={s.screen}>
      <LinearGradient colors={['#E8EFFF', '#F5F3FF', '#fff']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Image source={require('../../../assets/only_logo.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>Secure your app</Text>
        <Text style={s.sub}>
          {step === 'choose'
            ? 'Create a 4-digit PIN. After 1 hour of inactivity you can unlock with PIN'
            : 'Enter your PIN again to confirm'}
          {biometricAvailable ? ', face, or fingerprint' : ''} — no password needed each time.
        </Text>

        {biometricAvailable && step === 'choose' && (
          <View style={s.bioRow}>
            <View style={s.bioLeft}>
              <Ionicons name="finger-print" size={22} color="#4361EE" />
              <Text style={s.bioLabel}>Enable {biometricLabel}</Text>
            </View>
            <Switch value={enableBio} onValueChange={setEnableBio} trackColor={{ true: '#a5b4fc' }} />
          </View>
        )}

        {busy ? (
          <ActivityIndicator size="large" color="#4361EE" style={{ marginVertical: 32 }} />
        ) : (
          <PinPad
            pinLength={PIN_LENGTH}
            filled={activePin.length}
            onDigit={onDigit}
            onBackspace={onBackspace}
          />
        )}

        {step === 'confirm' && (
          <TouchableOpacity style={s.backLink} onPress={resetChoose}>
            <Text style={s.backTxt}>Choose a different PIN</Text>
          </TouchableOpacity>
        )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  logo: { width: 52, height: 52, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  sub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bioLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bioLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  backLink: { marginTop: 20 },
  backTxt: { fontSize: 14, color: '#4361EE', fontWeight: '600' },
});
