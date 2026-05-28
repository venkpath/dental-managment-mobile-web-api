import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService, type ClinicOption } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { colors, spacing, typography, radius } from '../../theme';
import type { User } from '../../types';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = Math.round(SH * 0.52);

type Step = 'credentials' | 'clinic_select';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#d1fae5', text: '#065f46' },
  trial:     { bg: '#dbeafe', text: '#1e40af' },
  expired:   { bg: '#fee2e2', text: '#991b1b' },
  suspended: { bg: '#fef3c7', text: '#92400e' },
};

export default function LoginScreen() {
  const { login, setClinicId } = useAuthStore();

  const [step, setStep]                         = useState<Step>('credentials');
  const [email, setEmail]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [rememberMe, setRememberMe]             = useState(false);
  const [errors, setErrors]                     = useState<Record<string, string>>({});
  const [loading, setLoading]                   = useState(false);
  const [clinics, setClinics]                   = useState<ClinicOption[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [selectedClinicName, setSelectedClinicName] = useState('');
  const [confirming, setConfirming]             = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLookup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await authService.lookup(email.trim().toLowerCase(), password);
      if (!result.clinics?.length) {
        Alert.alert('No Clinics Found', 'No active clinics are associated with this account.');
        return;
      }
      if (result.clinics.length === 1) {
        await performLogin(result.clinics[0].clinic_id, result.clinics[0].clinic_name);
      } else {
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

  const performLogin = async (clinicId: string, clinicName?: string) => {
    setConfirming(true);
    try {
      setClinicId(clinicId);
      const result = await authService.login(email.trim().toLowerCase(), password, clinicId);
      await login(
        result.access_token,
        result.user as User,
        result.user.clinic_id || clinicId,
        result.user.branch_id ?? undefined,
        clinicName,
      );
    } catch (err: unknown) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Login failed.');
      setStep('credentials');
    } finally {
      setConfirming(false);
    }
  };

  // ── Credentials step ─────────────────────────────────────────────────────────
  if (step === 'credentials') {
    return (
      <View style={s.screen}>

        {/* ── Hero (full-bleed background + top bar) ───────────────── */}
        <View style={s.hero}>
          {/* Illustration — fills upper region, welcome text sits below */}
          <Image
            source={require('../../../assets/login_background.png')}
            style={s.heroImg}
            resizeMode="cover"
          />

          {/* Top bar on top of the illustration */}
          <SafeAreaView edges={['top']} style={s.topBarSafe}>
            <View style={s.topBar}>
              <View style={s.logoRow}>
                <Image source={require('../../../assets/icon.png')} style={s.logoImg} />
                <View>
                  <Text style={s.logoSmart}>Smart</Text>
                  <Text style={s.logoDental}>Dental Desk</Text>
                </View>
              </View>

              <View style={s.trustedBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#4361EE" />
                <View>
                  <Text style={s.trustedBy}>Trusted by</Text>
                  <Text style={s.trustedCount}>500+ clinics</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>

          {/* Welcome message sitting on the hero, just above the sheet */}
          <View style={s.heroCaption}>
            <Text style={s.title}>Welcome back!</Text>
            <Text style={s.subtitle}>Sign in to manage your dental clinic</Text>
          </View>
        </View>

        {/* ── Form sheet ───────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={s.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.grabber} />
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Email */}
            <View style={s.field}>
              <Text style={s.label}>Email Address</Text>
              <View style={[s.inputRow, !!errors.email && s.inputErr]}>
                <View style={s.iconL}>
                  <Ionicons name="mail" size={18} color="#4361EE" />
                </View>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: '' })); }}
                  placeholder="priya@smiledental.in"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {!!errors.email && <Text style={s.errTxt}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={s.field}>
              <View style={s.pwRow}>
                <Text style={s.label}>Password</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={s.forgot}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[s.inputRow, !!errors.password && s.inputErr]}>
                <View style={s.iconL}>
                  <Ionicons name="lock-closed-outline" size={18} color="#475569" />
                </View>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })); }}
                  placeholder="••••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
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

            {/* Remember me */}
            <TouchableOpacity style={s.remRow} onPress={() => setRememberMe((p) => !p)} activeOpacity={0.7}>
              <View style={[s.checkbox, rememberMe && s.checkOn]}>
                {rememberMe && <Ionicons name="checkmark" size={11} color="#fff" />}
              </View>
              <Text style={s.remTxt}>Remember me</Text>
            </TouchableOpacity>

            {/* Sign In */}
            <TouchableOpacity activeOpacity={0.87} onPress={handleLookup} disabled={loading} style={s.btnWrap}>
              <LinearGradient
                colors={['#4361EE', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btn}
              >
                <View style={s.btnIcon}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="medical" size={17} color="#fff" />}
                </View>
                <Text style={s.btnTxt}>Sign In</Text>
                {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>

            {/* Trust badges */}
            <View style={s.badges}>
              <View style={s.badge}>
                <Ionicons name="shield-checkmark" size={20} color="#4361EE" />
                <Text style={s.badgeTxt}>{'Secure &\nReliable'}</Text>
              </View>
              <View style={s.badge}>
                <Ionicons name="people" size={20} color="#7C3AED" />
                <Text style={s.badgeTxt}>{'500+ Clinics\nTrust Us'}</Text>
              </View>
              <View style={s.badge}>
                <Ionicons name="bar-chart" size={20} color="#059669" />
                <Text style={s.badgeTxt}>{'99.9% Uptime\nGuaranteed'}</Text>
              </View>
            </View>

            {/* Register */}
            <View style={s.regRow}>
              <Text style={s.regTxt}>Don't have an account? </Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={s.regLink}>Register now →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

      </View>
    );
  }

  // ── Clinic select ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeClinic}>
      <View style={s.flex}>
        <View style={s.selTop}>
          <TouchableOpacity onPress={() => setStep('credentials')} style={s.backBtn}>
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
              onPress={() => selectedClinicId && performLogin(selectedClinicId, selectedClinicName)}
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
  screen:  { flex: 1, backgroundColor: '#E8EFFF' },
  flex:    { flex: 1 },

  // Hero
  hero:        { height: HERO_H, backgroundColor: '#E8EFFF', overflow: 'hidden' },
  // Image sized to occupy the upper region only — bottom ~110px is reserved
  // for the welcome caption so the text never overlaps the illustration.
  heroImg:     { position: 'absolute', top: 56, left: 0, width: SW, height: HERO_H - 90 },
  topBarSafe:  { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImg:     { width: 40, height: 40, borderRadius: 10 },
  logoSmart:   { fontSize: 16, fontWeight: '800', color: '#0f172a', lineHeight: 18 },
  logoDental:  { fontSize: 11, fontWeight: '500', color: '#475569', lineHeight: 15 },

  trustedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: '#C7D7FF', paddingHorizontal: 12, paddingVertical: 8 },
  trustedBy:    { fontSize: 10, color: '#64748b', lineHeight: 13 },
  trustedCount: { fontSize: 11, fontWeight: '700', color: '#4361EE', lineHeight: 14 },

  // Welcome caption sitting on the hero, in clear space below the illustration
  heroCaption: { position: 'absolute', left: 0, right: 0, bottom: 30, alignItems: 'center', paddingHorizontal: 24 },
  title:       { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 4, textAlign: 'center', letterSpacing: -0.4 },
  subtitle:    { fontSize: 13, color: '#475569', textAlign: 'center' },

  // Form sheet — pulls up over the hero so the illustration blends behind it
  sheet:   { flex: 1, marginTop: -24, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowColor: '#0f172a', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 },
  grabber: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginTop: 10, marginBottom: 6 },
  scroll:  { flexGrow: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16 },

  // Fields
  field:    { marginBottom: 10 },
  label:    { fontSize: 12, fontWeight: '600', color: '#0f172a', marginBottom: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, height: 46, paddingRight: 12 },
  inputErr: { borderColor: '#ef4444' },
  iconL:    { width: 42, alignItems: 'center', justifyContent: 'center' },
  iconR:    { paddingLeft: 6 },
  input:    { flex: 1, fontSize: 14, color: '#0f172a' },
  errTxt:   { fontSize: 11, color: '#ef4444', marginTop: 3, fontWeight: '500' },

  pwRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  forgot: { fontSize: 12, fontWeight: '600', color: '#4361EE' },

  // Remember me
  remRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: '#c7d7ff', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkOn:  { backgroundColor: '#4361EE', borderColor: '#4361EE' },
  remTxt:   { fontSize: 13, color: '#64748b' },

  // Sign In
  btnWrap: { borderRadius: 999, marginBottom: 12, shadowColor: '#4361EE', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 7 },
  btn:     { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 18, gap: 10, borderRadius: 999 },
  btnIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  btnTxt:  { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },

  // Badges
  badges:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge:    { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  badgeTxt: { fontSize: 10, color: '#475569', fontWeight: '500', textAlign: 'center', lineHeight: 13 },

  // Register
  regRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  regTxt:  { fontSize: 14, color: '#64748b' },
  regLink: { fontSize: 14, fontWeight: '700', color: '#4361EE' },

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
