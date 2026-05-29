import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity, Image, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { userService, type DoctorAvailabilityRow } from '../../services/user.service';
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
import { canManageStaff } from '../../utils/permissions';
import type { Branch, BillingStackParamList, ClinicUser } from '../../types';

type Route = RouteProp<BillingStackParamList, 'EditStaff'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

type StaffDetail = ClinicUser & {
  signature_url?: string | null;
  specializations?: string[] | string | null;
};

const E164_RE = /^\+[1-9]\d{6,14}$/;

const DAYS = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 7, label: 'Sun' },
];

function defaultSchedule(): DoctorAvailabilityRow[] {
  return DAYS.map((d) => ({
    day_of_week: d.key,
    start_time: '09:00',
    end_time: '18:00',
    is_day_off: d.key === 7,
  }));
}

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

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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
    name: asset.fileName ?? `image-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

export default function EditStaffScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { userId } = route.params;
  const bottomInset = useBottomInset();
  const { user: sessionUser } = useAuthStore();
  const isSuperAdmin = isSessionSuperAdmin(sessionUser?.role);
  const canDelete = canManageStaff(sessionUser?.role);
  const roleOptions = useMemo(() => buildRoleOptions(isSuperAdmin), [isSuperAdmin]);

  const [loadedUser, setLoadedUser] = useState<StaffDetail | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Staff',
    branch_id: '',
    status: 'active',
    is_doctor: false,
    listed_in_directory: false,
    license_number: '',
    bio: '',
    years_experience: '',
    specializations: '',
    languages_spoken: '',
    consultation_fee: '',
  });
  const [featureGrants, setFeatureGrants] = useState<string[]>([]);
  const [grantsSaving, setGrantsSaving] = useState(false);
  const [schedule, setSchedule] = useState<DoctorAvailabilityRow[]>(defaultSchedule());
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [signatureFile, setSignatureFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [roleSheet, setRoleSheet] = useState(false);
  const [branchSheet, setBranchSheet] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);

  const optionalFeatures = form.role !== 'SuperAdmin' ? getOptionalFeaturesForRole(form.role) : [];
  const showIsDoctorToggle = form.role === 'Admin' || form.role === 'SuperAdmin';
  const showDoctorSection = isDoctorRole(form.role, form.is_doctor);
  const showAvailability = showDoctorSection;

  useFocusEffect(useCallback(() => {
    setBooting(true);
    Promise.all([
      branchService.list(),
      userService.get(userId),
      userService.getFeatureGrants(userId).catch(() => []),
      userService.getAvailability(userId).catch(() => []),
    ])
      .then(([brs, u, grants, avail]) => {
        const staff = u as StaffDetail;
        setLoadedUser(staff);
        setBranches(brs);
        setFeatureGrants(grants);

        const specs = Array.isArray(staff.specializations)
          ? staff.specializations.join(', ')
          : (staff.specializations as string | null | undefined) || '';

        setForm({
          name: staff.name ?? '',
          email: staff.email ?? '',
          phone: staff.phone ?? '',
          role: staff.role ?? 'Staff',
          branch_id: staff.branch_id ?? '',
          status: (staff.status ?? 'active').toLowerCase(),
          is_doctor: !!staff.is_doctor,
          listed_in_directory: staff.listed_in_directory ?? false,
          license_number: staff.license_number ?? '',
          bio: staff.bio ?? '',
          years_experience: staff.years_experience != null ? String(staff.years_experience) : '',
          specializations: specs,
          languages_spoken: staff.languages_spoken ?? '',
          consultation_fee: staff.consultation_fee != null ? String(staff.consultation_fee) : '',
        });

        if (staff.signature_url) setSignaturePreview(staff.signature_url);
        if (staff.profile_photo_url) setProfilePhotoPreview(staff.profile_photo_url);

        if (avail.length > 0) {
          const merged = defaultSchedule().map((def) => {
            const saved = avail.find((r) => r.day_of_week === def.day_of_week);
            return saved ? { ...def, ...saved } : def;
          });
          setSchedule(merged);
        }
        setScheduleLoaded(true);
      })
      .catch(() => Alert.alert('Error', 'Could not load user'))
      .finally(() => setBooting(false));
  }, [userId]));

  const set = (field: string, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const toggleGrant = (key: string, checked: boolean) => {
    setFeatureGrants((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const updateDay = (dayKey: number, field: keyof DoctorAvailabilityRow, value: string | boolean) => {
    setSchedule((prev) => prev.map((d) => (d.day_of_week === dayKey ? { ...d, [field]: value } : d)));
  };

  const pickProfilePhoto = async () => {
    const file = await pickImage();
    if (!file) return;
    setProfilePhotoFile(file);
    setProfilePhotoPreview(file.uri);
  };

  const removeProfilePhoto = () => {
    Alert.alert('Remove photo', 'Remove this profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await userService.deleteProfilePhoto(userId);
            setProfilePhotoFile(null);
            setProfilePhotoPreview(null);
            setLoadedUser((p) => (p ? { ...p, profile_photo_url: null } : p));
            Alert.alert('Removed', 'Profile photo removed.');
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove photo');
          }
        },
      },
    ]);
  };

  const pickSignature = async () => {
    const file = await pickImage();
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreview(file.uri);
  };

  const saveGrants = async () => {
    setGrantsSaving(true);
    try {
      await userService.setFeatureGrants(userId, featureGrants);
      Alert.alert('Saved', 'Feature access updated.');
    } catch {
      Alert.alert('Error', 'Failed to update feature access');
    } finally {
      setGrantsSaving(false);
    }
  };

  const saveSchedule = async () => {
    setScheduleSaving(true);
    try {
      await userService.upsertAvailability(
        userId,
        schedule.map(({ day_of_week, start_time, end_time, is_day_off }) => ({
          day_of_week,
          start_time,
          end_time,
          is_day_off,
        })),
      );
      Alert.alert('Saved', 'Availability schedule saved.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
    if (form.phone.trim() && !E164_RE.test(form.phone.trim())) {
      e.phone = 'Enter a valid phone number (E.164, e.g. +919876543210)';
    }
    if (form.license_number.length > 100) e.license_number = 'Max 100 characters';
    if (form.bio.length > 2000) e.bio = 'Max 2000 characters';
    if (form.specializations.length > 500) e.specializations = 'Max 500 characters';
    if (form.languages_spoken.length > 255) e.languages_spoken = 'Max 255 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const specsArray = form.specializations
        ? form.specializations.split(',').map((x) => x.trim()).filter(Boolean)
        : [];

      await userService.update(userId, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        branch_id: form.branch_id || undefined,
        phone: form.phone.trim() || undefined,
        status: form.status,
        is_doctor: form.is_doctor,
        listed_in_directory: form.listed_in_directory,
        license_number: form.license_number.trim() || undefined,
        bio: form.bio.trim() || undefined,
        years_experience: form.years_experience !== '' ? Number(form.years_experience) : undefined,
        specializations: specsArray.length > 0 ? specsArray : undefined,
        languages_spoken: form.languages_spoken.trim() || undefined,
        consultation_fee: form.consultation_fee !== '' ? Number(form.consultation_fee) : undefined,
      });

      if (signatureFile) {
        try {
          await userService.uploadSignature(userId, signatureFile);
        } catch {
          Alert.alert('Partial success', 'Staff updated, but signature upload failed.');
        }
      }

      if (profilePhotoFile) {
        try {
          const res = await userService.uploadProfilePhoto(userId, profilePhotoFile);
          setProfilePhotoPreview(res.profile_photo_url);
          setProfilePhotoFile(null);
        } catch {
          Alert.alert('Partial success', 'Staff updated, but profile photo upload failed.');
        }
      }

      Alert.alert('Saved', 'Staff member updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete staff member',
      `Permanently delete ${form.name || 'this user'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.delete(userId);
              Alert.alert('Deleted', 'Staff member removed.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete user');
            }
          },
        },
      ],
    );
  };

  if (booting) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScreenHeader title="Edit Staff Member" onBack={() => navigation.goBack()} />
        <View style={s.center}><Text style={s.muted}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Edit Staff Member" subtitle={form.name || loadedUser?.name} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]} keyboardShouldPersistTaps="handled">
          <FormSection title="Profile Photo">
            <View style={s.photoRow}>
              {profilePhotoPreview ? (
                <Image source={{ uri: profilePhotoPreview }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitials}>{initials(form.name || 'U')}</Text>
                </View>
              )}
              <View style={s.photoActions}>
                <Button title="Change photo" variant="outline" size="sm" onPress={pickProfilePhoto} />
                {(profilePhotoPreview || loadedUser?.profile_photo_url) ? (
                  <Button title="Remove" variant="ghost" size="sm" onPress={removeProfilePhoto} />
                ) : null}
              </View>
            </View>
          </FormSection>

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
            hint={errors.phone ? undefined : 'E.164 format. Required for WhatsApp confirmations & reminders to dentists.'}
          />

          <SelectField
            label="Role *"
            value={roleOptions.find((r) => r.value === form.role)?.label ?? form.role}
            onPress={() => setRoleSheet(true)}
          />
          <SelectField
            label="Branch"
            value={branches.find((b) => b.id === form.branch_id)?.name ?? 'All Branches'}
            onPress={() => setBranchSheet(true)}
          />
          <SelectField
            label="Status"
            value={form.status === 'inactive' ? 'Inactive' : 'Active'}
            onPress={() => setStatusSheet(true)}
          />

          {optionalFeatures.length > 0 ? (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardHeaderText}>
                  <Text style={s.cardTitle}>Optional Feature Access</Text>
                  <Text style={s.cardDesc}>Grant access to modules beyond this role&apos;s defaults.</Text>
                </View>
                <Button title="Save" size="sm" onPress={saveGrants} loading={grantsSaving} />
              </View>
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
              <Input
                label="Specializations"
                value={form.specializations}
                onChangeText={(v) => set('specializations', v)}
                error={errors.specializations}
                placeholder="e.g., Orthodontics, Implants"
                hint="Comma-separated list"
              />
              <Input
                label="Years of Experience"
                value={form.years_experience}
                onChangeText={(v) => set('years_experience', v)}
                keyboardType="number-pad"
                placeholder="e.g., 10"
              />
              <Input
                label="Languages Spoken"
                value={form.languages_spoken}
                onChangeText={(v) => set('languages_spoken', v)}
                error={errors.languages_spoken}
                placeholder="e.g., English, Tamil, Hindi"
              />
              <Input
                label="Consultation Fee (₹)"
                value={form.consultation_fee}
                onChangeText={(v) => set('consultation_fee', v)}
                keyboardType="number-pad"
                placeholder="e.g., 500"
              />
              <Input
                label="Bio / About"
                value={form.bio}
                onChangeText={(v) => set('bio', v)}
                error={errors.bio}
                multiline
                placeholder="Brief description about the doctor…"
              />
              <FormSection title="Signature">
                {signaturePreview ? (
                  <View style={s.sigPreviewWrap}>
                    <Image source={{ uri: signaturePreview }} style={s.sigPreview} resizeMode="contain" />
                    <TouchableOpacity onPress={() => { setSignatureFile(null); setSignaturePreview(loadedUser?.signature_url ?? null); }}>
                      <Text style={s.removeLink}>Reset</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Button title="Choose signature image" variant="outline" size="sm" onPress={pickSignature} />
              </FormSection>
            </View>
          ) : null}

          {showAvailability && scheduleLoaded ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Weekly Availability</Text>
              <Text style={s.cardDesc}>
                Set this doctor&apos;s working hours per day. Days marked as Off show no slots to patients.
              </Text>
              {schedule.map((day) => {
                const dayLabel = DAYS.find((d) => d.key === day.day_of_week)?.label ?? '';
                return (
                  <View key={day.day_of_week} style={s.dayRow}>
                    <View style={s.dayHeader}>
                      <Text style={s.dayLabel}>{dayLabel}</Text>
                      <View style={s.dayToggle}>
                        <Switch
                          value={!day.is_day_off}
                          onValueChange={(on) => updateDay(day.day_of_week, 'is_day_off', !on)}
                          trackColor={{ false: colors.border, true: colors.primaryLight }}
                          thumbColor={!day.is_day_off ? colors.primary : '#f4f4f5'}
                        />
                        <Text style={s.dayStatus}>{day.is_day_off ? 'Off' : 'On'}</Text>
                      </View>
                    </View>
                    {!day.is_day_off ? (
                      <View style={s.timeRow}>
                        <Input
                          value={day.start_time}
                          onChangeText={(v) => updateDay(day.day_of_week, 'start_time', v)}
                          placeholder="09:00"
                          containerStyle={s.timeInput}
                        />
                        <Text style={s.timeSep}>to</Text>
                        <Input
                          value={day.end_time}
                          onChangeText={(v) => updateDay(day.day_of_week, 'end_time', v)}
                          placeholder="18:00"
                          containerStyle={s.timeInput}
                        />
                      </View>
                    ) : (
                      <Text style={s.offHint}>Not available</Text>
                    )}
                  </View>
                );
              })}
              <Button title="Save Schedule" variant="outline" size="sm" onPress={saveSchedule} loading={scheduleSaving} />
            </View>
          ) : null}

          <Button title="Update Staff" onPress={handleSave} loading={loading} />

          {canDelete ? (
            <Button title="Delete Staff Member" variant="danger" onPress={handleDelete} style={s.deleteBtn} />
          ) : null}
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
      <SelectSheet
        visible={statusSheet}
        title="Status"
        options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
        selectedValue={form.status}
        onSelect={(v) => set('status', v)}
        onClose={() => setStatusSheet(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 22, fontWeight: '700', color: colors.primary },
  photoActions: { flex: 1, gap: spacing.xs },
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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardHeaderText: { flex: 1 },
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
  dayRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, width: 36 },
  dayToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayStatus: { fontSize: 12, color: colors.textMuted, width: 28 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: 36 },
  timeInput: { flex: 1, marginBottom: 0 },
  timeSep: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 4 },
  offHint: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  deleteBtn: { marginTop: spacing.sm },
});
