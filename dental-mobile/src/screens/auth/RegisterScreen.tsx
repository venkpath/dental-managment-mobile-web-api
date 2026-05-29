import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Switch, Dimensions,
  Keyboard, TouchableWithoutFeedback, InputAccessoryView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CountryCodePicker from '../../components/CountryCodePicker';
import PlanPicker from '../../components/PlanPicker';
import { getRegistrationPlan } from '../../constants/registrationPlans';
import { authService } from '../../services/auth.service';
import { DEFAULT_COUNTRY, type CountryDial } from '../../utils/countryCodes';
import { toE164Phone } from '../../utils/phone';
import { LegalAgreement, LegalNotice } from '../../components/LegalText';
import type { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
type Step = 'phone' | 'verify' | 'details';

const { width: SW } = Dimensions.get('window');
const REG_PHONE_DONE_ID = 'register-phone-done';

const C = {
  indigo: '#4361EE', purple: '#7C3AED', indigoLight: '#EEF2FF', bg: '#F8FAFC', surface: '#fff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8', border: '#E2E8F0', red: '#dc2626',
  logoBlue: '#0891b2', logoGreen: '#059669',
};

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);

  const [phoneLocal, setPhoneLocal] = useState('');
  const [country, setCountry] = useState<CountryDial>(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [e164Phone, setE164Phone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');

  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDoctor, setIsDoctor] = useState(true);
  const [license, setLicense] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);

  const stepIndex = step === 'phone' ? 0 : step === 'verify' ? 1 : 2;

  const dismissKeyboard = () => Keyboard.dismiss();

  const openCountryPicker = () => {
    dismissKeyboard();
    phoneInputRef.current?.blur();
    requestAnimationFrame(() => setCountryPickerOpen(true));
  };

  const sendOtp = async () => {
    dismissKeyboard();
    const digits = phoneLocal.replace(/\D/g, '');
    if (digits.length < country.minLength || digits.length > country.maxLength) {
      Alert.alert(
        'Invalid phone',
        `Enter a valid ${country.minLength}${country.minLength !== country.maxLength ? `–${country.maxLength}` : ''}-digit number for ${country.name}.`,
      );
      return;
    }
    const phone = toE164Phone(phoneLocal, country.dial);
    setLoading(true);
    try {
      const res = await authService.sendRegistrationOtp(phone);
      setE164Phone(phone);
      setClinicPhone(digits);
      Alert.alert('OTP sent', res.message);
      setStep('verify');
    } catch (e) {
      Alert.alert('Could not send OTP', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length < 4) {
      Alert.alert('Enter OTP', 'Enter the code sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyRegistrationOtp(e164Phone, otp.trim());
      if (!res.verified || !res.token) {
        Alert.alert('Verification failed', res.message);
        return;
      }
      setVerificationToken(res.token);
      setStep('details');
    } catch (e) {
      Alert.alert('Verification failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async () => {
    if (!acceptedLegal) {
      Alert.alert('Terms required', 'Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    if (!clinicName.trim() || !clinicEmail.trim() || !adminName.trim() || !adminEmail.trim()) {
      Alert.alert('Missing fields', 'Fill in clinic and admin details.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authService.registerClinic({
        clinic_name: clinicName.trim(),
        clinic_email: clinicEmail.trim().toLowerCase(),
        clinic_phone: clinicPhone || phoneLocal.replace(/\D/g, ''),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: 'India',
        admin_name: adminName.trim(),
        admin_email: adminEmail.trim().toLowerCase(),
        admin_phone: e164Phone,
        admin_password: password,
        phone_verification_token: verificationToken,
        is_doctor: isDoctor,
        license_number: isDoctor ? license.trim() || undefined : undefined,
        plan_key: selectedPlan,
        billing_cycle: billingCycle,
      });
      const planName = getRegistrationPlan(selectedPlan).name;
      const trialNote = selectedPlan === 'free'
        ? 'Your Free plan is active.'
        : 'Your 14-day trial has started.';
      Alert.alert(
        'Welcome to Smart Dental Desk',
        `${trialNote} Sign in with your email and password. Plan: ${planName}.`,
        [{ text: 'Sign in', onPress: () => navigation.navigate('Login') }],
      );
    } catch (e) {
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'phone') navigation.goBack();
    else setStep(step === 'verify' ? 'phone' : 'verify');
  };

  return (
    <>
    <SafeAreaView style={[s.screen, step === 'phone' && s.screenPhone]} edges={['top', 'bottom']}>
      {step === 'phone' && (
        <LinearGradient
          colors={['#F3F0FF', '#F5F3FF', '#FAFAFC']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Register clinic</Text>
            <Text style={s.subtitle}>Step {stepIndex + 1} of 3</Text>
          </View>
          {step !== 'phone' && (
            <Image source={require('../../../assets/only_logo.png')} style={s.headerLogo} resizeMode="contain" />
          )}
        </View>

        <View style={s.progress}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[s.progressDot, i <= stepIndex && s.progressDotOn]} />
          ))}
        </View>

        {step === 'phone' ? (
          <ScrollView
            contentContainerStyle={s.phoneScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
            <View>
            <View style={s.regHero}>
              <View style={s.regArchWrap}>
                <LinearGradient
                  colors={['rgba(167, 139, 250, 0.2)', 'rgba(8, 145, 178, 0.08)', 'rgba(248, 250, 252, 0)']}
                  locations={[0, 0.55, 1]}
                  style={s.regArch}
                />
              </View>
              <Image
                source={require('../../../assets/register_tooth.png')}
                style={s.regHeroImg}
                resizeMode="contain"
              />
            </View>

            <View style={s.regCard}>
              <View style={s.stepBadge}>
                <Ionicons name="shield-checkmark" size={14} color={C.indigo} />
                <Text style={s.stepBadgeTxt}>Secure mobile verification</Text>
              </View>

              <Text style={s.regCardTitle}>Verify your mobile</Text>
              <Text style={s.regCardHint}>
                Start your 14-day free trial — we'll send a one-time code to get you started.
              </Text>

              <View style={s.channelRow}>
                <View style={s.channelChip}>
                  <Ionicons name="chatbubble-outline" size={14} color={C.indigo} />
                  <Text style={s.channelTxt}>SMS</Text>
                </View>
                <View style={s.channelChip}>
                  <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                  <Text style={s.channelTxt}>WhatsApp</Text>
                </View>
              </View>

              <Text style={s.label}>Mobile number</Text>
              <View style={[s.inputRow, s.inputRowSpaced]}>
                <View style={s.iconL}>
                  <Ionicons name="call-outline" size={20} color={C.indigo} />
                </View>
                <TouchableOpacity
                  style={s.ccPicker}
                  onPress={openCountryPicker}
                  activeOpacity={0.7}
                >
                  <Text style={s.ccFlag}>{country.flag}</Text>
                  <Text style={s.ccTxt}>+{country.dial}</Text>
                  <Ionicons name="chevron-down" size={16} color={C.indigo} />
                </TouchableOpacity>
                <TextInput
                  ref={phoneInputRef}
                  style={s.inputInner}
                  value={phoneLocal}
                  onChangeText={setPhoneLocal}
                  placeholder={country.placeholder}
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  maxLength={country.maxLength}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={dismissKeyboard}
                  inputAccessoryViewID={Platform.OS === 'ios' ? REG_PHONE_DONE_ID : undefined}
                />
              </View>

              <PrimaryButton label="Send OTP" onPress={sendOtp} loading={loading} />

              <LegalNotice prefix="By continuing" style={s.legalHint} centered />

              <View style={s.trustRow}>
                <View style={s.trustChip}>
                  <Ionicons name="flash" size={13} color={C.purple} />
                  <Text style={s.trustTxt}>2 min setup</Text>
                </View>
                <View style={s.trustChip}>
                  <Ionicons name="gift-outline" size={13} color={C.logoGreen} />
                  <Text style={s.trustTxt}>Free trial</Text>
                </View>
              </View>
            </View>

            <View style={s.footer}>
              <Text style={s.footerTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={s.link}>Sign in</Text>
              </TouchableOpacity>
            </View>
            </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        ) : (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 'verify' && (
            <>
              <Text style={s.stepTitle}>Enter OTP</Text>
              <Text style={s.stepHint}>Sent to {e164Phone}</Text>
              <Text style={s.label}>One-time password</Text>
              <View style={[s.inputRow, s.inputRowSpaced]}>
                <View style={s.iconL}>
                  <Ionicons name="keypad-outline" size={20} color={C.indigo} />
                </View>
                <TextInput
                  style={[s.inputInner, s.otpInput]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <PrimaryButton label="Verify" onPress={verifyOtp} loading={loading} />
              <TouchableOpacity onPress={sendOtp} disabled={loading}>
                <Text style={s.link}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'details' && (
            <>
              <Text style={s.stepTitle}>Clinic & admin</Text>
              <Field label="Clinic name" value={clinicName} onChangeText={setClinicName} placeholder="Bright Smile Dental" icon="business-outline" />
              <Field label="Clinic email" value={clinicEmail} onChangeText={setClinicEmail} placeholder="clinic@example.com" keyboardType="email-address" icon="mail-outline" />
              <Field label="Address (optional)" value={address} onChangeText={setAddress} placeholder="Street address" icon="location-outline" />
              <View style={s.row2}>
                <View style={{ flex: 1 }}><Field label="City" value={city} onChangeText={setCity} placeholder="City" icon="map-outline" /></View>
                <View style={{ flex: 1 }}><Field label="State" value={state} onChangeText={setState} placeholder="State" icon="map-outline" /></View>
              </View>
              <Field label="Admin / doctor name" value={adminName} onChangeText={setAdminName} placeholder="Dr. Priya Sharma" icon="person-outline" />
              <Field label="Admin login email" value={adminEmail} onChangeText={setAdminEmail} placeholder="priya@clinic.com" keyboardType="email-address" icon="mail-outline" />
              <Field label="Password" value={password} onChangeText={setPassword} secure icon="lock-closed-outline" />
              <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secure icon="lock-closed-outline" />
              <View style={s.switchRow}>
                <Text style={s.label}>I am a practicing dentist</Text>
                <Switch value={isDoctor} onValueChange={setIsDoctor} trackColor={{ true: C.indigo }} />
              </View>
              {isDoctor && (
                <Field label="License number (optional)" value={license} onChangeText={setLicense} placeholder="Registration no." icon="document-text-outline" />
              )}

              <Text style={[s.label, { marginTop: 4 }]}>Plan</Text>
              <PlanPicker
                selected={selectedPlan}
                onSelect={setSelectedPlan}
                billingCycle={billingCycle}
                onBillingCycleChange={setBillingCycle}
              />

              <LegalAgreement
                checked={acceptedLegal}
                onToggle={() => setAcceptedLegal((v) => !v)}
              />

              <PrimaryButton
                label={selectedPlan === 'free' ? 'Create clinic account' : 'Start free trial'}
                onPress={submitRegister}
                loading={loading}
              />
            </>
          )}

          <View style={s.footer}>
            <Text style={s.footerTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.link}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && step === 'phone' && (
        <InputAccessoryView nativeID={REG_PHONE_DONE_ID}>
          <View style={s.keyboardAccessory}>
            <TouchableOpacity onPress={dismissKeyboard} style={s.keyboardDoneBtn} hitSlop={8}>
              <Text style={s.keyboardDoneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>

    <CountryCodePicker
      visible={countryPickerOpen}
      selected={country}
      onSelect={(c) => {
        setCountry(c);
        if (phoneLocal.length > c.maxLength) {
          setPhoneLocal(phoneLocal.slice(0, c.maxLength));
        }
      }}
      onClose={() => setCountryPickerOpen(false)}
    />
    </>
  );
}

type FieldIcon = React.ComponentProps<typeof Ionicons>['name'];

function Field({
  label, value, onChangeText, placeholder, keyboardType, secure, icon = 'ellipse-outline',
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'email-address'; secure?: boolean;
  icon?: FieldIcon;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <View style={s.iconL}>
          <Ionicons name={icon} size={20} color={C.indigo} />
        </View>
        <TextInput
          style={s.inputInner}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          secureTextEntry={secure}
        />
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} disabled={loading} style={s.btnWrap}>
      <LinearGradient colors={['#4361EE', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  screenPhone: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 12, color: C.textSub },
  headerLogo: { width: 40, height: 40 },
  progress: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 4 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  progressDotOn: { backgroundColor: C.indigo },
  phoneScroll: { paddingBottom: 24, flexGrow: 1 },
  regHero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: Math.min(SW * 0.52, 220),
    marginBottom: -28,
    zIndex: 1,
  },
  regArchWrap: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
  },
  regArch: {
    width: SW * 0.72,
    height: SW * 0.36,
    borderTopLeftRadius: SW * 0.36,
    borderTopRightRadius: SW * 0.36,
    overflow: 'hidden',
  },
  regHeroImg: {
    width: SW * 0.55,
    height: SW * 0.42,
    maxHeight: 200,
  },
  regCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: C.indigoLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#c7d7ff',
  },
  stepBadgeTxt: { fontSize: 12, fontWeight: '600', color: C.indigo },
  regCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  regCardHint: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 21,
    marginBottom: 14,
  },
  channelRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: C.border,
  },
  channelTxt: { fontSize: 12, fontWeight: '600', color: C.textSub },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
  },
  trustTxt: { fontSize: 11, fontWeight: '600', color: C.textSub },
  scroll: { padding: 20, paddingBottom: 32 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 6 },
  stepHint: { fontSize: 13, color: C.textSub, marginBottom: 16, lineHeight: 19 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputRowSpaced: { marginBottom: 18 },
  iconL: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputInner: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: C.text,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    paddingRight: 14,
  },
  ccPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
    marginRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: '#e2e8f0',
    height: 32,
  },
  ccFlag: { fontSize: 18 },
  ccTxt: { fontSize: 15, fontWeight: '700', color: C.indigo },
  otpInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  btnWrap: {
    borderRadius: 999,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: C.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  btn: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '700', color: C.indigo, textAlign: 'center' },
  legalHint: { marginTop: 12, marginBottom: 4, paddingHorizontal: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  row2: { flexDirection: 'row', gap: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, paddingHorizontal: 16 },
  footerTxt: { fontSize: 14, color: C.textSub },
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
  keyboardDoneTxt: { fontSize: 16, fontWeight: '600', color: C.indigo },
});
