import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { userService } from '../../services/user.service';
import { branchService } from '../../services/branch.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import SelectSheet from '../../components/SelectSheet';
import { SelectField, FormSection } from '../../components/FormSection';
import { colors, spacing, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useAuthStore } from '../../store/auth.store';
import { getOptionalFeaturesForRole, isDoctorRole } from '../../utils/userFeatureGrants';
import type { Branch, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

const E164_RE = /^\+[1-9]\d{6,14}$/;

function isSessionSuperAdmin(role?: string | null): boolean {
  const r = (role ?? '').toUpperCase().replace(/\s/g, '_');
  return r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
}

function buildRoleOptions(isSuperAdmin: boolean) {
  const opts: { value: string; label: string }[] = [];
  if (isSuperAdmin) opts.push({ value: 'SuperAdmin', label: 'SuperAdmin (Clinic Owner)' });
  opts.push(
    { value: 'Admin', label: 'Admin' },
    { value: 'Dentist', label: 'Dentist' },
    { value: 'Consultant', label: 'Consultant' },
    { value: 'Receptionist', label: 'Receptionist' },
    { value: 'Staff', label: 'Staff' },
  );
  return opts;
}

function CheckboxRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity style={s.checkRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
      <Ionicons
        name={value ? 'checkbox' : 'square-outline'}
        size={22}
        color={value ? colors.primary : colors.textMuted}
      />
      <View style={s.checkBody}>
        <Text style={s.checkLabel}>{label}</Text>
        {desc ? <Text style={s.checkDesc}>{desc}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

async function pickImage(): Promise<{ uri: string; name: string; type: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow access to your photo library.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? `signature-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

export default function AddStaffScreen() {
  const navigation = useNavigation<Nav>();
  const bottomInset = useBottomInset();
  const { user: sessionUser } = useAuthStore();
  const isSuperAdmin = isSessionSuperAdmin(sessionUser?.role);
  const roleOptions = useMemo(() => buildRoleOptions(isSuperAdmin), [isSuperAdmin]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Staff',
    branch_id: '',
    is_doctor: false,
    listed_in_directory: true,
    license_number: '',
  });
  const [featureGrants, setFeatureGrants] = useState<string[]>([]);
  const [signatureFile, setSignatureFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [roleSheet, setRoleSheet] = useState(false);
  const [branchSheet, setBranchSheet] = useState(false);

  const optionalFeatures = form.role !== 'SuperAdmin' ? getOptionalFeaturesForRole(form.role) : [];
  const showIsDoctorToggle = form.role === 'Admin' || form.role === 'SuperAdmin';
  const showDoctorSection = isDoctorRole(form.role, form.is_doctor);

  useFocusEffect(useCallback(() => {
    branchService.list().then(setBranches).catch(() => {});
  }, []));

  const set = (field: string, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const toggleGrant = (key: string, checked: boolean) => {
    setFeatureGrants((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const pickSignature = async () => {
    const file = await pickImage();
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreview(file.uri);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
    if (form.phone.trim() && !E164_RE.test(form.phone.trim())) {
      e.phone = 'Enter a valid phone number (E.164, e.g. +919876543210)';
    }
    if (form.password.trim() && form.password.trim().length < 6) {
      e.password = 'Min 6 characters';
    }
    if (form.license_number.length > 100) e.license_number = 'Max 100 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const created = await userService.create({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        branch_id: form.branch_id || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password.trim() || undefined,
        is_doctor: form.is_doctor,
        listed_in_directory: form.listed_in_directory,
        license_number: form.license_number.trim() || undefined,
      });

      if (signatureFile && created?.id) {
        try {
          await userService.uploadSignature(created.id, signatureFile);
        } catch {
          Alert.alert('Partial success', 'Staff added, but signature upload failed. Edit the staff record to retry.');
        }
      }

      if (featureGrants.length > 0 && created?.id) {
        await userService.setFeatureGrants(created.id, featureGrants).catch(() => null);
      }

      Alert.alert('Saved', 'Staff member added.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Add Staff Member" subtitle="Add a new team member to your clinic" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]} keyboardShouldPersistTaps="handled">
          <Input label="Full Name *" value={form.name} onChangeText={(v) => set('name', v)} error={errors.name} />
          <Input
            label="Email *"
            value={form.email}
            onChangeText={(v) => set('email', v)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChangeText={(v) => set('phone', v)}
            error={errors.phone}
            keyboardType="phone-pad"
            placeholder="+919876543210"
            hint={errors.phone ? undefined : 'E.164 format (e.g. +919876543210). Required for WhatsApp confirmations & reminders to dentists.'}
          />
          <Input
            label="Password"
            value={form.password}
            onChangeText={(v) => set('password', v)}
            error={errors.password}
            secureTextEntry
            placeholder="Default: Admin@123"
            hint="Leave empty to use default password (Admin@123)"
          />
          <SelectField
            label="Role *"
            value={roleOptions.find((r) => r.value === form.role)?.label ?? ''}
            error={errors.role}
            onPress={() => setRoleSheet(true)}
          />
          <SelectField
            label="Branch"
            value={branches.find((b) => b.id === form.branch_id)?.name ?? 'All Branches'}
            onPress={() => setBranchSheet(true)}
            placeholder="All Branches (Admin)"
          />
          <Text style={s.fieldHint}>Leave empty for access to all branches</Text>

          {optionalFeatures.length > 0 ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Optional Feature Access</Text>
              <Text style={s.cardDesc}>
                Grant additional module access beyond this role&apos;s defaults. The clinic must also have the feature enabled.
              </Text>
              {optionalFeatures.map((f) => (
                <CheckboxRow
                  key={f.key}
                  label={f.label}
                  desc={f.desc}
                  value={featureGrants.includes(f.key)}
                  onChange={(checked) => toggleGrant(f.key, checked)}
                />
              ))}
            </View>
          ) : null}

          {showIsDoctorToggle ? (
            <View style={s.card}>
              <CheckboxRow
                label="Also a dentist"
                desc="Will appear in doctor dropdowns and receive appointment reminders"
                value={form.is_doctor}
                onChange={(v) => set('is_doctor', v)}
              />
            </View>
          ) : null}

          {showDoctorSection ? (
            <View style={s.card}>
              <Text style={s.sectionLabel}>Doctor Details (optional — printed on prescriptions)</Text>
              <View style={s.innerCard}>
                <CheckboxRow
                  label="Show in public patient directory"
                  desc="This doctor will appear on your clinic's public profile page for patients to see"
                  value={form.listed_in_directory}
                  onChange={(v) => set('listed_in_directory', v)}
                />
              </View>
              <Input
                label="Registration / License Number"
                value={form.license_number}
                onChangeText={(v) => set('license_number', v)}
                error={errors.license_number}
                placeholder="e.g., KDC-12345"
              />
              <FormSection title="Signature">
                {signaturePreview ? (
                  <View style={s.sigPreviewWrap}>
                    <Image source={{ uri: signaturePreview }} style={s.sigPreview} resizeMode="contain" />
                    <TouchableOpacity onPress={() => { setSignatureFile(null); setSignaturePreview(null); }}>
                      <Text style={s.removeLink}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Button title="Choose signature image" variant="outline" size="sm" onPress={pickSignature} />
                <Text style={s.fieldHint}>Uploaded after the staff member is created</Text>
              </FormSection>
            </View>
          ) : null}

          <Button title="Add Staff" onPress={handleSave} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={roleSheet}
        title="Role"
        options={roleOptions}
        selectedValue={form.role}
        onSelect={(v) => {
          set('role', v);
          if (v !== 'Admin' && v !== 'SuperAdmin') set('is_doctor', v === 'Dentist' || v === 'Consultant');
        }}
        onClose={() => setRoleSheet(false)}
      />
      <SelectSheet
        visible={branchSheet}
        title="Branch"
        options={[{ value: '', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
        selectedValue={form.branch_id}
        onSelect={(v) => set('branch_id', v)}
        onClose={() => setBranchSheet(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: -4, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  innerCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardDesc: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 6 },
  checkBody: { flex: 1 },
  checkLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  checkDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sigPreviewWrap: { alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.sm },
  sigPreview: { width: '100%', height: 80, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  removeLink: { fontSize: 13, color: colors.danger, fontWeight: '600' },
});
