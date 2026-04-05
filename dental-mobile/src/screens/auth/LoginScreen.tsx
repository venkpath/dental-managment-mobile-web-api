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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { authService, type ClinicOption } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import type { User } from '../../types';

type Step = 'credentials' | 'clinic_select';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#d1fae5', text: '#065f46' },
  trial:     { bg: '#dbeafe', text: '#1e40af' },
  expired:   { bg: '#fee2e2', text: '#991b1b' },
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
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0e7490', '#0891b2', '#06b6d4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientTop}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.hero}>
              <View style={styles.logoContainer}>
                <View style={styles.logoRing}>
                  <Ionicons name="medical" size={32} color={colors.white} />
                </View>
              </View>
              <Text style={styles.appName}>Smart Dental Desk</Text>
              <Text style={styles.appTagline}>Staff Portal</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
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
                  rightElement={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
                />

                <Input
                  label="Password"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })); }}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  error={errors.password}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword((p) => !p)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  }
                />
              </View>

              <Button
                title="Sign In"
                onPress={handleLookup}
                loading={loading}
                size="lg"
                style={styles.signInBtn}
                icon={!loading ? <Ionicons name="arrow-forward" size={18} color={colors.white} /> : undefined}
              />
            </View>

            <Text style={styles.helpText}>
              Contact your clinic admin for login credentials
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Clinic selection step ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeClinic}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.flex}>
        <View style={styles.selectorTop}>
          <TouchableOpacity onPress={() => setStep('credentials')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.selectorTitleBlock}>
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
            const s = STATUS_STYLE[item.subscription_status] ?? { bg: colors.secondaryLight, text: colors.textSecondary };
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setSelectedClinicId(item.clinic_id); setSelectedClinicName(item.clinic_name); }}
                style={[styles.clinicCard, isSelected && styles.clinicCardSelected]}
              >
                <View style={[styles.clinicAvatar, isSelected && styles.clinicAvatarSelected]}>
                  {isSelected ? (
                    <Ionicons name="business" size={20} color={colors.white} />
                  ) : (
                    <Text style={styles.clinicAvatarText}>
                      {item.clinic_name.substring(0, 2).toUpperCase()}
                    </Text>
                  )}
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
                    <Text style={styles.roleText}>{item.role}</Text>
                  </View>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <Button
              title="Continue"
              onPress={() => selectedClinicId && performLogin(selectedClinicId, selectedClinicName)}
              loading={confirming}
              disabled={!selectedClinicId}
              size="lg"
              style={styles.continueBtn}
              icon={!confirming ? <Ionicons name="arrow-forward" size={18} color={colors.white} /> : undefined}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: 0 },

  // Gradient header
  gradientTop: {
    paddingBottom: spacing['2xl'],
  },

  // Hero section
  hero: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.base,
  },
  logoContainer: {
    marginBottom: spacing.base,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: typography.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Form card
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    marginTop: -spacing.base,
    ...shadow.xl,
  },
  formHeading: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  formSubheading: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  fields: { gap: 0 },
  signInBtn: { marginTop: spacing.base },
  helpText: {
    textAlign: 'center',
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },

  // Clinic selector
  safeClinic: { flex: 1, backgroundColor: colors.background },
  selectorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTitleBlock: { flex: 1 },
  selectorHeading: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  selectorSub: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  clinicList: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing['2xl'] },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  clinicCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  clinicAvatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicAvatarSelected: { backgroundColor: colors.primary },
  clinicAvatarText: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  clinicDetails: { flex: 1 },
  clinicName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  clinicNameSelected: { color: colors.primaryDark, fontWeight: '700' },
  clinicEmail: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  clinicBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  roleText: { fontSize: typography.xs, color: colors.textMuted, textTransform: 'capitalize' },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  continueBtn: { marginTop: spacing.base },
});
