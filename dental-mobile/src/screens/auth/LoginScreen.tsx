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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { authService, type ClinicOption } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import type { User } from '../../types';

type Step = 'credentials' | 'clinic_select';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#dcfce7', text: '#15803d' },
  trial:     { bg: '#dbeafe', text: '#1d4ed8' },
  expired:   { bg: '#fee2e2', text: '#b91c1c' },
  suspended: { bg: '#fef3c7', text: '#92400e' },
};

export default function LoginScreen() {
  const { login, setClinicId } = useAuthStore();

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [selectedClinicName, setSelectedClinicName] = useState<string>('');
  const [confirming, setConfirming] = useState(false);

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
        clinicName
      );
    } catch (err: unknown) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Login failed.');
      setStep('credentials');
    } finally {
      setConfirming(false);
    }
  };

  // ── Credentials step ─────────────────────────────────────────────
  if (step === 'credentials') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.logoRing}>
                <View style={styles.logoInner}>
                  <Text style={styles.logoEmoji}>🦷</Text>
                </View>
              </View>
              <Text style={styles.appName}>Smart Dental Desk</Text>
              <Text style={styles.appTagline}>Staff Portal</Text>
            </View>

            {/* Card */}
            <View style={styles.formCard}>
              <Text style={styles.formHeading}>Welcome back</Text>
              <Text style={styles.formSubheading}>Sign in to manage your clinic</Text>

              <View style={styles.fields}>
                <Input
                  label="Email Address"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: '' })); }}
                  placeholder="doctor@clinic.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.email}
                  prefix="✉"
                />

                <View>
                  <Input
                    label="Password"
                    value={password}
                    onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })); }}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    error={errors.password}
                  />
                  <TouchableOpacity
                    style={styles.eyeToggle}
                    onPress={() => setShowPassword((p) => !p)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title="Sign In"
                onPress={handleLookup}
                loading={loading}
                size="lg"
                style={styles.signInBtn}
              />
            </View>

            <Text style={styles.helpText}>
              Contact your clinic admin for login credentials
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Clinic selection step ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.flex}>
        <View style={styles.selectorTop}>
          <TouchableOpacity onPress={() => setStep('credentials')} style={styles.backBtn}>
            <Text style={styles.backChevron}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.selectorHeading}>Select Clinic</Text>
            <Text style={styles.selectorSub}>Your account is linked to {clinics.length} clinics</Text>
          </View>
        </View>

        <FlatList
          data={clinics}
          keyExtractor={(item) => item.clinic_id}
          contentContainerStyle={styles.clinicList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedClinicId === item.clinic_id;
            const s = STATUS_STYLE[item.subscription_status] ?? { bg: colors.borderLight, text: colors.textSecondary };
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => { setSelectedClinicId(item.clinic_id); setSelectedClinicName(item.clinic_name); }}
                style={[styles.clinicCard, isSelected && styles.clinicCardSelected]}
              >
                <View style={[styles.clinicAvatar, isSelected && styles.clinicAvatarSelected]}>
                  <Text style={styles.clinicAvatarText}>
                    {item.clinic_name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.clinicDetails}>
                  <Text style={[styles.clinicName, isSelected && styles.clinicNameSelected]}>
                    {item.clinic_name}
                  </Text>
                  <Text style={styles.clinicEmail}>{item.clinic_email}</Text>
                  <View style={styles.clinicBadgeRow}>
                    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusPillText, { color: s.text }]}>
                        {item.subscription_status}
                      </Text>
                    </View>
                    <Text style={styles.roleText}>· {item.role}</Text>
                  </View>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <Button
              title="Continue →"
              onPress={() => selectedClinicId && performLogin(selectedClinicId, selectedClinicName)}
              loading={confirming}
              disabled={!selectedClinicId}
              size="lg"
              style={styles.continueBtn}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.base, paddingBottom: spacing['2xl'] },

  // Hero section
  hero: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    ...shadow.md,
  },
  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 32 },
  appName: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 3,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Form card
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.lg,
    marginBottom: spacing.lg,
  },
  formHeading: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  formSubheading: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  fields: { gap: 0 },
  eyeToggle: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md + 14,
  },
  eyeIcon: { fontSize: 18 },
  signInBtn: { marginTop: spacing.sm },
  helpText: {
    textAlign: 'center',
    fontSize: typography.xs,
    color: colors.textMuted,
  },

  // Clinic selector
  selectorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: { fontSize: 24, color: colors.primary, fontWeight: '700', lineHeight: 28 },
  selectorHeading: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  selectorSub: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  clinicList: { padding: spacing.base, gap: spacing.sm, paddingBottom: spacing['2xl'] },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  clinicCardSelected: { borderColor: colors.primary, backgroundColor: '#f0f9ff' },
  clinicAvatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicAvatarSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  clinicAvatarText: { fontSize: typography.sm, fontWeight: '800', color: colors.primary },
  clinicDetails: { flex: 1 },
  clinicName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  clinicNameSelected: { color: colors.primaryDark },
  clinicEmail: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  clinicBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.xs },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  roleText: { fontSize: typography.xs, color: colors.textMuted, textTransform: 'capitalize' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  continueBtn: { marginTop: spacing.sm },
});
