import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/auth.store';
import { userService } from '../../services/user.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, spacing, typography, radius, shadow } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthStore();
  const bottomInset = useBottomInset();

  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdLoading, setPwdLoading] = useState(false);

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

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrator',
    DENTIST: 'Dentist',
    CONSULTANT: 'Consultant',
    RECEPTIONIST: 'Receptionist',
    STAFF: 'Staff',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: spacing['2xl'] + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar + user info */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.userName}>{user?.name ?? '—'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
            {user?.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{roleLabel[user.role] ?? user.role}</Text>
              </View>
            )}
          </View>

          {/* Account actions */}
          <Text style={styles.sectionLabel}>Security</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setChangingPwd((p) => !p)}
            >
              <Text style={styles.menuIcon}>🔑</Text>
              <Text style={styles.menuLabel}>Change Password</Text>
              <Text style={styles.menuChevron}>{changingPwd ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </View>

          {changingPwd && (
            <View style={styles.pwdForm}>
              <Input
                label="Current Password"
                value={pwdForm.current}
                onChangeText={(v) => setField('current', v)}
                secureTextEntry
                error={pwdErrors.current}
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                value={pwdForm.newPwd}
                onChangeText={(v) => setField('newPwd', v)}
                secureTextEntry
                error={pwdErrors.newPwd}
                placeholder="Min 6 characters"
              />
              <Input
                label="Confirm New Password"
                value={pwdForm.confirm}
                onChangeText={(v) => setField('confirm', v)}
                secureTextEntry
                error={pwdErrors.confirm}
                placeholder="Re-enter new password"
              />
              <Button
                title="Update Password"
                onPress={handleChangePassword}
                loading={pwdLoading}
                size="md"
              />
            </View>
          )}

          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={styles.logoutLabel}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Smart Dental Desk • Staff App</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.base },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary },
  userName: { fontSize: typography.xl, fontWeight: '700', color: colors.text, marginBottom: 4 },
  userEmail: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: { fontSize: typography.xs, fontWeight: '700', color: colors.primary },
  sectionLabel: {
    fontSize: typography.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2,
  },
  logoutItem: {},
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: typography.base, color: colors.text, fontWeight: '500' },
  menuChevron: { fontSize: 12, color: colors.textMuted },
  logoutLabel: { flex: 1, fontSize: typography.base, color: colors.danger, fontWeight: '600' },
  pwdForm: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md, ...shadow.sm,
  },
  versionText: {
    textAlign: 'center', fontSize: typography.xs,
    color: colors.textMuted, marginTop: spacing.lg,
  },
});
