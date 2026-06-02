import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import { useDeviceLockStore } from '../../store/deviceLock.store';
import { userService } from '../../services/user.service';
import Input from '../../components/Input';
import UserAvatar from '../../components/UserAvatar';
import { pickImageFromLibrary } from '../../utils/pickImage';
import { refreshUserProfile } from '../../utils/refreshUserProfile';
import { useBottomInset } from '../../hooks/useBottomInset';
import { LegalLinkList } from '../../components/LegalText';
import { shadow } from '../../theme';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const C = {
  indigo: '#4361EE',
  indigoLight: '#EEF2FF',
  violet: '#7C3AED',
  bg: '#F8FAFC',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#475569',
  textMuted: '#94a3b8',
  border: '#E2E8F0',
  red: '#dc2626',
  redLight: '#FEE2E2',
  green: '#059669',
  greenLight: '#DCFCE7',
};

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Administrator',
  Dentist: 'Dentist',
  Consultant: 'Consultant',
  Receptionist: 'Receptionist',
  Staff: 'Staff',
};

function roleAccent(role?: string): { bg: string; fg: string } {
  switch (role) {
    case 'SuperAdmin':
    case 'Admin':
      return { bg: C.indigoLight, fg: C.indigo };
    case 'Dentist':
    case 'Consultant':
      return { bg: C.greenLight, fg: C.green };
    default:
      return { bg: '#F1F5F9', fg: C.textSub };
  }
}

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, clinicName } = useAuthStore();
  const lockApp = useDeviceLockStore((s) => s.lockApp);
  const bottomInset = useBottomInset();

  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdLoading, setPwdLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.profile_photo_url ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUserProfile().then(() => {
        const u = useAuthStore.getState().user;
        setPhotoUrl(u?.profile_photo_url ?? null);
      });
    }, []),
  );

  const setField = (field: string, value: string) => {
    setPwdForm((p) => ({ ...p, [field]: value }));
    setPwdErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleChangePassword = async () => {
    const e: Record<string, string> = {};
    if (!pwdForm.current) e.current = 'Required';
    if (!pwdForm.newPwd || pwdForm.newPwd.length < 6) e.newPwd = 'Min 6 characters';
    if (pwdForm.newPwd !== pwdForm.confirm) e.confirm = 'Passwords do not match';
    setPwdErrors(e);
    if (Object.keys(e).length > 0) return;

    setPwdLoading(true);
    try {
      await userService.changePassword(pwdForm.current, pwdForm.newPwd);
      Alert.alert('Success', 'Password changed successfully.');
      setPwdForm({ current: '', newPwd: '', confirm: '' });
      setChangingPwd(false);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLockApp = () => {
    lockApp();
    navigation.goBack();
  };

  const handleLogout = () => {
    Alert.alert(
      'Lock app?',
      'You will stay signed in — unlock with your PIN or Face ID next time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Lock', onPress: handleLockApp },
      ],
    );
  };

  const changePhoto = async () => {
    if (!user?.id) return;
    const file = await pickImageFromLibrary();
    if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await userService.uploadProfilePhoto(user.id, file);
      setPhotoUrl(res.profile_photo_url);
      useAuthStore.getState().patchUser({ profile_photo_url: res.profile_photo_url });
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = () => {
    if (!user?.id) return;
    Alert.alert('Remove photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await userService.deleteProfilePhoto(user.id);
            setPhotoUrl(null);
            useAuthStore.getState().patchUser({ profile_photo_url: null });
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove photo.');
          }
        },
      },
    ]);
  };

  const roleStyle = roleAccent(user?.role);
  const displayRole = user?.role ? (ROLE_LABEL[user.role] ?? user.role) : null;

  return (
    <View style={s.screen}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.topbar}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={s.titleBlock}>
            <Text style={s.title}>Profile</Text>
            <Text style={s.subtitle}>Account & security</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.content, { paddingBottom: 24 + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <LinearGradient
            colors={['#4361EE', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.avatarRing}>
              {photoUploading ? (
                <View style={s.avatarLoading}>
                  <ActivityIndicator color={C.indigo} size="large" />
                </View>
              ) : (
                <View style={s.avatarInner}>
                  <UserAvatar name={user?.name} photoUrl={photoUrl} size="lg" />
                </View>
              )}
              <TouchableOpacity
                style={s.cameraBtn}
                onPress={changePhoto}
                disabled={photoUploading}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={s.heroName}>{user?.name ?? '—'}</Text>
            {displayRole && (
              <View style={[s.heroRolePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={s.heroRoleTxt}>{displayRole}</Text>
              </View>
            )}
            {clinicName ? (
              <View style={s.heroClinicRow}>
                <Ionicons name="business-outline" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={s.heroClinic} numberOfLines={1}>{clinicName}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {/* Photo actions */}
          <View style={s.card}>
            <View style={s.photoActionRow}>
              <TouchableOpacity
                style={s.photoPrimaryBtn}
                onPress={changePhoto}
                disabled={photoUploading}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={18} color={C.indigo} />
                <Text style={s.photoPrimaryTxt}>{photoUrl ? 'Change photo' : 'Add photo'}</Text>
              </TouchableOpacity>
              {photoUrl ? (
                <TouchableOpacity
                  onPress={removePhoto}
                  disabled={photoUploading}
                  style={s.photoGhostBtn}
                  activeOpacity={0.7}
                >
                  <Text style={s.photoRemoveTxt}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {!photoUrl && (
              <Text style={s.photoHint}>
                Shown on your profile and the home screen header
              </Text>
            )}
          </View>

          {/* Details */}
          <Text style={s.sectionTitle}>Account details</Text>
          <View style={s.card}>
            <View style={s.detailRow}>
              <View style={[s.menuIconBox, { backgroundColor: C.indigoLight }]}>
                <Ionicons name="mail-outline" size={20} color={C.indigo} />
              </View>
              <View style={s.detailCol}>
                <Text style={s.detailLabel}>Email</Text>
                <Text style={s.detailValue}>{user?.email ?? '—'}</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.detailRow}>
              <View style={[s.menuIconBox, { backgroundColor: roleStyle.bg }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={roleStyle.fg} />
              </View>
              <View style={s.detailCol}>
                <Text style={s.detailLabel}>Role</Text>
                <Text style={s.detailValue}>{displayRole ?? '—'}</Text>
              </View>
            </View>
          </View>

          {/* Security */}
          <Text style={s.sectionTitle}>Security</Text>
          <View style={s.cardPad}>
            <TouchableOpacity
              style={s.menuRow}
              onPress={() => setChangingPwd((p) => !p)}
              activeOpacity={0.7}
            >
              <View style={[s.menuIconBox, { backgroundColor: C.indigoLight }]}>
                <Ionicons name="lock-closed-outline" size={20} color={C.indigo} />
              </View>
              <View style={s.menuTextCol}>
                <Text style={s.menuLabel}>Change password</Text>
                <Text style={s.menuSub}>
                  {changingPwd ? 'Tap to collapse' : 'Update your login password'}
                </Text>
              </View>
              <Ionicons
                name={changingPwd ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={C.textMuted}
              />
            </TouchableOpacity>
          </View>

          {changingPwd && (
            <View style={s.card}>
              <Input
                label="Current password"
                value={pwdForm.current}
                onChangeText={(v) => setField('current', v)}
                secureTextEntry
                error={pwdErrors.current}
                placeholder="Enter current password"
              />
              <Input
                label="New password"
                value={pwdForm.newPwd}
                onChangeText={(v) => setField('newPwd', v)}
                secureTextEntry
                error={pwdErrors.newPwd}
                placeholder="Min 6 characters"
              />
              <Input
                label="Confirm new password"
                value={pwdForm.confirm}
                onChangeText={(v) => setField('confirm', v)}
                secureTextEntry
                error={pwdErrors.confirm}
                placeholder="Re-enter new password"
              />
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={pwdLoading}
                activeOpacity={0.85}
                style={s.submitWrap}
              >
                <LinearGradient
                  colors={['#4361EE', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.submitBtn, pwdLoading && { opacity: 0.7 }]}
                >
                  {pwdLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={s.submitTxt}>Update password</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Legal */}
          <Text style={s.sectionTitle}>Legal</Text>
          <LegalLinkList />

          {/* Sign out */}
          <Text style={s.sectionTitle}>Session</Text>
          <TouchableOpacity
            style={s.signOutCard}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={[s.menuIconBox, { backgroundColor: C.redLight }]}>
              <Ionicons name="log-out-outline" size={20} color={C.red} />
            </View>
            <Text style={s.signOutLabel}>Sign out</Text>
            <Ionicons name="chevron-forward" size={18} color={C.red} />
          </TouchableOpacity>

          <Text style={s.footer}>Smart Dental Desk · Staff app</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  safeTop: { backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },

  hero: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
    ...shadow.md,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInner: {
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarLoading: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.indigo,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroRolePill: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroRoleTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  heroClinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    maxWidth: '100%',
  },
  heroClinic: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500', flexShrink: 1 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow.sm,
  },
  cardPad: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...shadow.sm,
  },

  photoActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.indigoLight,
    borderWidth: 1,
    borderColor: '#c7d7ff',
  },
  photoPrimaryTxt: { fontSize: 14, fontWeight: '700', color: C.indigo },
  photoGhostBtn: { paddingVertical: 12, paddingHorizontal: 8 },
  photoRemoveTxt: { fontSize: 14, fontWeight: '600', color: C.red },
  photoHint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.textSub,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.2,
  },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', color: C.text },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  menuSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  submitWrap: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    ...shadow.sm,
  },
  signOutLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: C.red },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: C.textMuted,
    marginTop: 8,
    marginBottom: 8,
  },
});
