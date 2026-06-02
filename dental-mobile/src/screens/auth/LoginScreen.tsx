import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService, type ClinicOption } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { useDeviceLockStore } from '../../store/deviceLock.store';
import { refreshClinicBranding } from '../../utils/refreshClinicBranding';
import { refreshSubscription } from '../../store/subscription.store';
import { refreshUserProfile } from '../../utils/refreshUserProfile';
import { colors, spacing, typography, radius } from '../../theme';
import {
  isPhoneLoginIdentifier,
  validateLoginIdentifier,
  parseLoginIdentifier,
} from '../../utils/loginIdentifier';
import { LegalNotice } from '../../components/LegalText';
import type { User, AuthStackParamList } from '../../types';

type PendingAuth = {
  identifier: string;
  password: string;
  isPhone: boolean;
};

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = Math.round(SH * 0.40);
const LOGIN_KEYBOARD_DONE_ID = 'login-keyboard-done';

const LOGO_BLUE = '#0891b2';
const LOGO_GREEN = '#059669';
const PURPLE = '#635BFF';
const PURPLE_GRAD = ['#7C3AED', '#4361EE'] as const;

type Step = 'credentials' | 'clinic_select';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#d1fae5', text: '#065f46' },
  trial:     { bg: '#dbeafe', text: '#1e40af' },
  expired:   { bg: '#fee2e2', text: '#991b1b' },
  suspended: { bg: '#fef3c7', text: '#92400e' },
};

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type LoginRoute = RouteProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const route = useRoute<LoginRoute>();
  const { login, setClinicId } = useAuthStore();
  const onLoginSuccess = useDeviceLockStore((s) => s.onLoginSuccess);

  const [step, setStep]                         = useState<Step>('credentials');
  const [identifier, setIdentifier]             = useState(route.params?.identifier ?? '');
  const [password, setPassword]                 = useState('');
  const [pendingAuth, setPendingAuth]           = useState<PendingAuth | null>(null);
  const [showPassword, setShowPassword]         = useState(false);
  const [rememberMe, setRememberMe]             = useState(false);
  const [errors, setErrors]                     = useState<Record<string, string>>({});
  const [loading, setLoading]                   = useState(false);
  const [clinics, setClinics]                   = useState<ClinicOption[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [selectedClinicName, setSelectedClinicName] = useState('');
  const [confirming, setConfirming]             = useState(false);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (route.params?.identifier) return;
    const saved = useDeviceLockStore.getState().loginIdentifier;
    if (saved) setIdentifier(saved);
  }, [route.params?.identifier]);

  const dismissKeyboard = () => Keyboard.dismiss();

  const validate = () => {
    const e: Record<string, string> = {};
    const idErr = validateLoginIdentifier(identifier);
    if (idErr) e.identifier = idErr;
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLookup = async () => {
    dismissKeyboard();
    if (!validate()) return;
    const parsed = parseLoginIdentifier(identifier);
    setLoading(true);
    try {
      const result = parsed.isPhone
        ? await authService.lookupByPhone(parsed.phone, password)
        : await authService.lookup(parsed.email, password);

      const authPayload: PendingAuth = {
        identifier: parsed.isPhone ? parsed.phone : parsed.email,
        password,
        isPhone: parsed.isPhone,
      };

      if (!result.clinics?.length) {
        Alert.alert('No Clinics Found', 'No active clinics are associated with this account.');
        return;
      }
      if (result.clinics.length === 1) {
        await performLogin(result.clinics[0].clinic_id, result.clinics[0].clinic_name, authPayload);
      } else {
        setPendingAuth(authPayload);
        setClinics(result.clinics);
        setSelectedClinicId(result.clinics[0].clinic_id);
        setSelectedClinicName(result.clinics[0].clinic_name);
        setStep('clinic_select');
      }
    } catch (err: unknown) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const performLogin = async (
    clinicId: string,
    clinicName?: string,
    auth: PendingAuth | null = pendingAuth,
  ) => {
    if (!auth) return;
    setConfirming(true);
    try {
      setClinicId(clinicId);
      const result = auth.isPhone
        ? await authService.loginByPhone(auth.identifier, auth.password, clinicId)
        : await authService.login(auth.identifier, auth.password, clinicId);
      await login(
        result.access_token,
        result.user as User,
        result.user.clinic_id || clinicId,
        result.user.branch_id ?? undefined,
        clinicName,
        result.refresh_token,
      );
      await Promise.all([refreshClinicBranding(), refreshSubscription(), refreshUserProfile()]);
      await onLoginSuccess({
        identifier: auth.identifier,
        identifierType: auth.isPhone ? 'phone' : 'email',
        displayName: (result.user as User).name,
      });
    } catch (err: unknown) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Login failed.');
      setStep('credentials');
      setPendingAuth(null);
    } finally {
      setConfirming(false);
    }
  };

  const identifierIsPhone = isPhoneLoginIdentifier(identifier);
  const insets = useSafeAreaInsets();
  const sheetBottomPad = Math.max(insets.bottom, 12) + 12;

  // ── Credentials step ─────────────────────────────────────────────────────────
  if (step === 'credentials') {
    return (
      <View style={s.screen}>
        <LinearGradient
          colors={['#E8EFFF', '#F3F0FF', '#F5F3FF']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={s.hero}>
          <Image
            source={require('../../../assets/dental_scene_transparent.png')}
            style={s.heroImg}
            resizeMode="contain"
          />

          <View style={s.floatChipL}>
            <Ionicons name="lock-closed" size={16} color={PURPLE} />
          </View>
          <View style={s.floatChipR}>
            <Ionicons name="people" size={16} color="#4361EE" />
          </View>

          <SafeAreaView edges={['top']} style={s.topBarSafe}>
            <View style={s.topBar}>
              <TouchableOpacity onPress={() => navigation.navigate('Welcome')} style={s.backHero} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color="#0f172a" />
              </TouchableOpacity>
              <View style={s.brandRow}>
                <Image source={require('../../../assets/only_logo.png')} style={s.brandMark} resizeMode="contain" />
                <View>
                  <Text style={s.brandSmart}>Smart</Text>
                  <Text style={s.brandDental}>Dental Desk</Text>
                </View>
              </View>
              <View style={s.trustedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#4361EE" />
                <View>
                  <Text style={s.trustedBy}>Trusted by</Text>
                  <Text style={s.trustedCount}>500+ clinics</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <KeyboardAvoidingView
          style={s.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[s.scroll, { paddingBottom: sheetBottomPad }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
            <View>
              <Text style={s.welcomeTitle}>Welcome back! 👋</Text>
              <Text style={s.welcomeSub}>Sign in to your clinic account</Text>

              <View style={s.field}>
                <Text style={s.label}>Email or Phone Number</Text>
                <View style={[s.inputRow, s.inputRowFocus, !!errors.identifier && s.inputErr]}>
                  <View style={s.iconL}>
                    <Ionicons
                      name={identifierIsPhone ? 'call-outline' : 'mail-outline'}
                      size={20}
                      color="#4361EE"
                    />
                  </View>
                  <TextInput
                    style={s.input}
                    value={identifier}
                    onChangeText={(v) => { setIdentifier(v); setErrors((p) => ({ ...p, identifier: '' })); }}
                    placeholder="doctor@clinic.com or 9876543210"
                    placeholderTextColor="#94a3b8"
                    keyboardType={identifierIsPhone ? 'phone-pad' : 'email-address'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    inputAccessoryViewID={Platform.OS === 'ios' ? LOGIN_KEYBOARD_DONE_ID : undefined}
                  />
                </View>
                {!!errors.identifier && <Text style={s.errTxt}>{errors.identifier}</Text>}
              </View>

              <View style={s.field}>
                <View style={s.pwRow}>
                  <Text style={s.label}>Password</Text>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={s.forgot}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[s.inputRow, !!errors.password && s.inputErr]}>
                  <View style={s.iconL}>
                    <Ionicons name="lock-closed-outline" size={20} color="#4361EE" />
                  </View>
                  <TextInput
                    ref={passwordRef}
                    style={s.input}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })); }}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLookup}
                    blurOnSubmit
                    inputAccessoryViewID={Platform.OS === 'ios' ? LOGIN_KEYBOARD_DONE_ID : undefined}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((p) => !p)}
                    style={s.iconR}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
                {!!errors.password && <Text style={s.errTxt}>{errors.password}</Text>}
              </View>

              <TouchableOpacity
                style={s.remRow}
                onPress={() => { dismissKeyboard(); setRememberMe((p) => !p); }}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, rememberMe && s.checkOn]}>
                  {rememberMe && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={s.remTxt}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.88} onPress={handleLookup} disabled={loading} style={s.btnWrap}>
                <LinearGradient
                  colors={[...PURPLE_GRAD]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  <View style={s.btnIcon}>
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="sparkles" size={18} color="#fff" />}
                  </View>
                  <Text style={s.btnTxt}>Sign In</Text>
                  {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
                </LinearGradient>
              </TouchableOpacity>

              <View style={s.trustBox}>
                <View style={s.badge}>
                  <Ionicons name="shield-checkmark" size={22} color="#4361EE" />
                  <Text style={s.badgeTxt}>{'Secure &\nReliable'}</Text>
                </View>
                <View style={s.badge}>
                  <Ionicons name="people" size={22} color="#7C3AED" />
                  <Text style={s.badgeTxt}>{'500+ Clinics\nTrust Us'}</Text>
                </View>
                <View style={s.badge}>
                  <Ionicons name="shield-checkmark" size={22} color="#059669" />
                  <Text style={s.badgeTxt}>{'99.9% Uptime\nGuaranteed'}</Text>
                </View>
              </View>

              <View style={s.regRow}>
                <Text style={s.regTxt}>Don't have an account? </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Register')}>
                  <Text style={s.regLink}>Register now →</Text>
                </TouchableOpacity>
              </View>

              <LegalNotice prefix="By signing in" style={s.legalNotice} centered />
            </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>

        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={LOGIN_KEYBOARD_DONE_ID}>
            <View style={s.keyboardAccessory}>
              <TouchableOpacity onPress={dismissKeyboard} style={s.keyboardDoneBtn} hitSlop={8}>
                <Text style={s.keyboardDoneTxt}>Done</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
      </View>
    );
  }

  // ── Clinic select ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeClinic}>
      <View style={s.flex}>
        <View style={s.selTop}>
          <TouchableOpacity
            onPress={() => { setStep('credentials'); setPendingAuth(null); }}
            style={s.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={s.flex}>
            <Text style={s.selHead}>Select Clinic</Text>
            <Text style={s.selSub}>Your account is linked to {clinics.length} clinics</Text>
          </View>
        </View>

        <FlatList
          data={clinics}
          keyExtractor={(item) => item.clinic_id}
          contentContainerStyle={s.clinicList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const sel = selectedClinicId === item.clinic_id;
            const st = STATUS_STYLE[item.subscription_status] ?? { bg: colors.secondaryLight, text: colors.textSecondary };
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setSelectedClinicId(item.clinic_id); setSelectedClinicName(item.clinic_name); }}
                style={[s.clinicCard, sel && s.clinicCardSel]}
              >
                <View style={[s.avatar, sel && s.avatarSel]}>
                  {sel
                    ? <Ionicons name="business" size={20} color={colors.white} />
                    : <Text style={s.avatarTxt}>{item.clinic_name.substring(0, 2).toUpperCase()}</Text>
                  }
                </View>
                <View style={s.flex}>
                  <Text style={[s.cName, sel && s.cNameSel]}>{item.clinic_name}</Text>
                  <Text style={s.cEmail}>{item.clinic_email}</Text>
                  <View style={s.badgeRow}>
                    <View style={[s.pill, { backgroundColor: st.bg }]}>
                      <Text style={[s.pillTxt, { color: st.text }]}>{item.subscription_status}</Text>
                    </View>
                    <Text style={s.roleTxt}>{item.role}</Text>
                  </View>
                </View>
                <View style={[s.radio, sel && s.radioSel]}>
                  {sel && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <TouchableOpacity
              activeOpacity={0.87}
              onPress={() => selectedClinicId && pendingAuth && performLogin(selectedClinicId, selectedClinicName, pendingAuth)}
              disabled={!selectedClinicId || confirming}
              style={[s.btnWrap, { marginTop: spacing.base }]}
            >
              <LinearGradient
                colors={['#4361EE', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.btn, { justifyContent: 'center', gap: 10 }]}
              >
                {confirming
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Text style={[s.btnTxt, { flex: 0 }]}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          }
        />
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8EFFF' },
  flex: { flex: 1 },

  hero: { height: HERO_H, overflow: 'hidden' },
  heroImg: {
    position: 'absolute',
    top: 56,
    left: (SW - SW * 0.92) / 2,
    width: SW * 0.92,
    height: HERO_H - 48,
  },
  floatChipL: {
    position: 'absolute',
    left: 20,
    top: HERO_H * 0.42,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 1,
  },
  floatChipR: {
    position: 'absolute',
    right: 20,
    top: HERO_H * 0.38,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 1,
  },
  topBarSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  backHero: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 36, height: 36 },
  brandSmart: { fontSize: 15, fontWeight: '800', color: LOGO_BLUE, lineHeight: 17 },
  brandDental: { fontSize: 11, fontWeight: '700', color: LOGO_GREEN, lineHeight: 14 },

  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C7D7FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: SW * 0.36,
  },
  trustedBy: { fontSize: 9, color: '#64748b', lineHeight: 12 },
  trustedCount: { fontSize: 10, fontWeight: '700', color: '#4361EE', lineHeight: 13 },

  sheet: {
    flex: 1,
    marginTop: -64,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 14,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 22,
  },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 52,
    paddingRight: 12,
  },
  inputRowFocus: { borderColor: '#93c5fd' },
  inputErr: { borderColor: '#ef4444' },
  iconL: { width: 46, alignItems: 'center', justifyContent: 'center' },
  iconR: { paddingLeft: 6 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  errTxt: { fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: '500' },

  pwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgot: { fontSize: 12, fontWeight: '600', color: '#4361EE' },

  remRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, marginTop: 2 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c4b5fd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: PURPLE, borderColor: PURPLE },
  remTxt: { fontSize: 14, color: '#475569' },

  btnWrap: {
    borderRadius: 999,
    marginBottom: 20,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 20,
    gap: 10,
    borderRadius: 999,
  },
  btnIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },

  trustBox: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 18,
    gap: 4,
  },
  badge: { flex: 1, alignItems: 'center', gap: 6 },
  badgeTxt: { fontSize: 10, color: '#475569', fontWeight: '600', textAlign: 'center', lineHeight: 13 },

  regRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  regTxt: { fontSize: 14, color: '#64748b' },
  regLink: { fontSize: 14, fontWeight: '700', color: '#4361EE' },
  legalNotice: { marginTop: 10 },

  keyboardAccessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keyboardDoneBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  keyboardDoneTxt: { fontSize: 16, fontWeight: '600', color: '#4361EE' },

  // Clinic select
  safeClinic: { flex: 1, backgroundColor: colors.background },
  selTop:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  backBtn:    { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  selHead:    { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  selSub:     { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  clinicList: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  clinicCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, borderWidth: 1.5, borderColor: colors.border, marginBottom: spacing.sm },
  clinicCardSel: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  avatar:     { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  avatarSel:  { backgroundColor: colors.primary },
  avatarTxt:  { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  cName:      { fontSize: typography.base, fontWeight: '600', color: colors.text },
  cNameSel:   { color: colors.primaryDark, fontWeight: '700' },
  cEmail:     { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  badgeRow:   { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  pill:       { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.xs },
  pillTxt:    { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  roleTxt:    { fontSize: typography.xs, color: colors.textMuted, textTransform: 'capitalize' },
  radio:      { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSel:   { borderColor: colors.primary, backgroundColor: colors.primary },
});
