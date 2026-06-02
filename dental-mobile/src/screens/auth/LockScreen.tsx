import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PinPad from '../../components/PinPad';
import { PIN_LENGTH } from '../../services/deviceLock.service';
import { useDeviceLockStore } from '../../store/deviceLock.store';
import { useAuthStore } from '../../store/auth.store';

export default function LockScreen() {
  const {
    displayName,
    loginIdentifier,
    loginIdentifierType,
    biometricEnabled,
    biometricAvailable,
    biometricLabel,
    pinError,
    failedAttempts,
    unlockWithPin,
    unlockWithBiometric,
    forgotPin: resetPinAndSignIn,
  } = useDeviceLockStore();
  const logout = useAuthStore((s) => s.logout);

  const [pin, setPin] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const [pinVerifying, setPinVerifying] = useState(false);
  const bioStarted = useRef(false);

  const showBio = biometricEnabled;
  const showBioHint = biometricAvailable && !biometricEnabled;

  const submitPin = async (code: string) => {
    if (pinVerifying || failedAttempts >= 5) return;
    setPinVerifying(true);
    try {
      const ok = await unlockWithPin(code);
      if (!ok) setPin('');
    } finally {
      setPinVerifying(false);
    }
  };

  const onDigit = (digit: string) => {
    if (pinVerifying || bioLoading || failedAttempts >= 5) return;
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) void submitPin(next);
  };

  const onBackspace = () => {
    if (pinVerifying || bioLoading) return;
    setPin((p) => p.slice(0, -1));
  };

  const tryBiometric = async () => {
    if (!showBio || bioLoading || pinVerifying) return;
    setBioLoading(true);
    try {
      await unlockWithBiometric();
    } finally {
      setBioLoading(false);
    }
  };

  useEffect(() => {
    if (!biometricEnabled || bioStarted.current) return;
    bioStarted.current = true;
    const t = setTimeout(() => {
      void tryBiometric();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
  }, []);

  const usePassword = async () => {
    await useDeviceLockStore.getState().preparePasswordLogin();
    await logout();
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot PIN?',
      'Sign in with your clinic password to set a new PIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            await resetPinAndSignIn();
            await logout();
          },
        },
      ],
    );
  };

  const maskedId = loginIdentifier
    ? loginIdentifierType === 'phone'
      ? loginIdentifier.replace(/(\d{2})\d+(\d{2})/, '$1••••••$2')
      : loginIdentifier.replace(/(^.).*(@.*$)/, '$1••••$2')
    : '';

  const padDisabled = failedAttempts >= 5 || bioLoading || pinVerifying;

  return (
    <View style={s.screen}>
      <LinearGradient colors={['#E8EFFF', '#F5F3FF', '#fff']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Image source={require('../../../assets/only_logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>Unlock app</Text>
          {displayName ? <Text style={s.name}>{displayName}</Text> : null}
          {maskedId ? <Text style={s.sub}>{maskedId}</Text> : null}
          <Text style={s.hint}>Enter your 4-digit PIN</Text>
          {pinError ? <Text style={s.error}>{pinError}</Text> : null}

          <View style={s.padWrap}>
            <PinPad
              pinLength={PIN_LENGTH}
              filled={pin.length}
              onDigit={onDigit}
              onBackspace={onBackspace}
              disabled={padDisabled}
            />
            {pinVerifying && (
              <View style={s.padOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color="#4361EE" />
              </View>
            )}
          </View>

          {showBio && (
            <TouchableOpacity style={s.bioBtn} onPress={tryBiometric} disabled={bioLoading}>
              <Ionicons name="finger-print" size={22} color="#4361EE" />
              <Text style={s.bioTxt}>
                {bioLoading ? 'Checking…' : `Unlock with ${biometricLabel}`}
              </Text>
            </TouchableOpacity>
          )}
          {showBioHint ? (
            <Text style={s.bioHint}>
              Face ID / fingerprint is available on this device. Re-enable it in Profile after sign-in, or use PIN.
            </Text>
          ) : null}

          <TouchableOpacity style={s.forgotBtn} onPress={handleForgotPin}>
            <Text style={s.forgotTxt}>Forgot PIN?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.altBtn} onPress={usePassword}>
            <Text style={s.altTxt}>Use password instead</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 28,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  logo: { width: 56, height: 56, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  name: { fontSize: 16, fontWeight: '600', color: '#334155', marginTop: 4 },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  hint: { fontSize: 13, color: '#94a3b8', marginTop: 8, marginBottom: 8 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  padWrap: {
    width: '100%',
    maxWidth: 340,
    minHeight: 280,
    position: 'relative',
    marginVertical: 12,
    alignSelf: 'center',
  },
  padOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
  },
  bioTxt: { fontSize: 14, fontWeight: '600', color: '#4361EE' },
  bioHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 12 },
  forgotBtn: { marginTop: 16, padding: 8 },
  forgotTxt: { fontSize: 14, color: '#4361EE', fontWeight: '600' },
  altBtn: { marginTop: 8, padding: 12 },
  altTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});
