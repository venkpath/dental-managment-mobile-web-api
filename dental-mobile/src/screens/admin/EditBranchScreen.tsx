import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Image,
  KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { branchService } from '../../services/branch.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { FormSection } from '../../components/FormSection';
import { colors, spacing, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'EditBranch'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

function isValidUrl(str: string): boolean {
  if (!str.trim()) return true;
  try {
    new URL(str.trim());
    return true;
  } catch {
    return false;
  }
}

function parseCoord(value: string, min: number, max: number): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (isNaN(n) || n < min || n > max) return NaN;
  return n;
}

export default function EditBranchScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { branchId } = route.params;
  const bottomInset = useBottomInset();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    latitude: '',
    longitude: '',
    map_url: '',
    book_now_url: '',
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  useFocusEffect(useCallback(() => {
    branchService.get(branchId)
      .then((b) => {
        setForm({
          name: b.name ?? '',
          phone: b.phone ?? '',
          address: b.address ?? '',
          city: b.city ?? '',
          state: b.state ?? '',
          country: b.country ?? '',
          pincode: b.pincode ?? '',
          latitude: b.latitude != null ? String(b.latitude) : '',
          longitude: b.longitude != null ? String(b.longitude) : '',
          map_url: b.map_url ?? '',
          book_now_url: b.book_now_url ?? '',
        });
        setPhotoUrl(b.photo_url ?? null);
      })
      .catch(() => Alert.alert('Error', 'Could not load branch'))
      .finally(() => setBooting(false));
  }, [branchId]));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Branch name is required';
    if (form.pincode.trim().length > 10) e.pincode = 'Max 10 characters';
    const lat = parseCoord(form.latitude, -90, 90);
    if (lat !== undefined && isNaN(lat)) e.latitude = 'Must be between -90 and 90';
    const lng = parseCoord(form.longitude, -180, 180);
    if (lng !== undefined && isNaN(lng)) e.longitude = 'Must be between -180 and 180';
    if (!isValidUrl(form.book_now_url)) e.book_now_url = 'Must be a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const lat = parseCoord(form.latitude, -90, 90);
      const lng = parseCoord(form.longitude, -180, 180);
      await branchService.update(branchId, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        latitude: lat !== undefined && !isNaN(lat) ? lat : null,
        longitude: lng !== undefined && !isNaN(lng) ? lng : null,
        map_url: form.map_url.trim() || undefined,
        book_now_url: form.book_now_url.trim() || null,
      });
      Alert.alert('Saved', 'Branch updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to your photo library to upload a branch photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName ?? `branch-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      };
      setUploadingPhoto(true);
      const updated = await branchService.uploadPhoto(branchId, file);
      setPhotoUrl(updated.photo_url ?? null);
      Alert.alert('Uploaded', 'Branch photo updated.');
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async () => {
    Alert.alert('Remove photo', 'Remove the branch cover photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemovingPhoto(true);
          try {
            await branchService.deletePhoto(branchId);
            setPhotoUrl(null);
            Alert.alert('Removed', 'Branch photo removed.');
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not remove photo');
          } finally {
            setRemovingPhoto(false);
          }
        },
      },
    ]);
  };

  if (booting) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScreenHeader title="Edit branch" onBack={() => navigation.goBack()} />
        <View style={s.center}><Text style={s.muted}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Edit branch" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]} keyboardShouldPersistTaps="handled">
          <FormSection title="Cover photo">
            {photoUrl ? (
              <View style={s.photoRow}>
                <Image source={{ uri: photoUrl }} style={s.photoPreview} />
                <View style={s.photoActions}>
                  <TouchableOpacity style={s.photoBtn} onPress={pickPhoto} disabled={uploadingPhoto} activeOpacity={0.7}>
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                        <Text style={s.photoBtnTxt}>Replace</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.photoBtn, s.photoBtnDanger]} onPress={removePhoto} disabled={removingPhoto} activeOpacity={0.7}>
                    {removingPhoto ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={[s.photoBtnTxt, s.photoBtnTxtDanger]}>Remove</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={s.photoEmpty} onPress={pickPhoto} disabled={uploadingPhoto} activeOpacity={0.7}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="large" color={colors.textMuted} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                    <Text style={s.photoEmptyTxt}>Tap to upload (PNG/JPEG/WebP)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </FormSection>

          <TouchableOpacity
            style={s.schedLink}
            onPress={() => navigation.navigate('BranchScheduling', { branchId })}
            activeOpacity={0.7}
          >
            <View style={s.schedLinkIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View style={s.schedLinkBody}>
              <Text style={s.schedLinkTitle}>Scheduling settings</Text>
              <Text style={s.schedLinkSub}>Working hours, slots, and days</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={s.sectionHead}>Profile</Text>
          <Input label="Branch name *" value={form.name} onChangeText={(v) => set('name', v)} error={errors.name} />
          <Input label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
          <Input label="Address" value={form.address} onChangeText={(v) => set('address', v)} multiline />
          <Input label="City" value={form.city} onChangeText={(v) => set('city', v)} />
          <Input label="State" value={form.state} onChangeText={(v) => set('state', v)} />
          <Input label="Country" value={form.country} onChangeText={(v) => set('country', v)} />
          <Input label="Pincode" value={form.pincode} onChangeText={(v) => set('pincode', v)} keyboardType="number-pad" error={errors.pincode} />

          <FormSection title="Location">
            <Input
              label="Latitude"
              value={form.latitude}
              onChangeText={(v) => set('latitude', v)}
              keyboardType="decimal-pad"
              placeholder="12.9716"
              error={errors.latitude}
            />
            <Input
              label="Longitude"
              value={form.longitude}
              onChangeText={(v) => set('longitude', v)}
              keyboardType="decimal-pad"
              placeholder="77.5946"
              error={errors.longitude}
            />
            <Input
              label="Google Maps URL"
              value={form.map_url}
              onChangeText={(v) => set('map_url', v)}
              autoCapitalize="none"
              placeholder="https://maps.google.com/…"
            />
            <Text style={s.hint}>Used for WhatsApp &quot;Get Directions&quot; button.</Text>
          </FormSection>

          <Input
            label="Book Now URL"
            value={form.book_now_url}
            onChangeText={(v) => set('book_now_url', v)}
            autoCapitalize="none"
            placeholder="https://your-booking-site.com/book"
            error={errors.book_now_url}
          />
          <Text style={s.hint}>Leave blank to use SmartDentalDesk booking page.</Text>

          <Button title="Save changes" onPress={handleSave} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  sectionHead: {
    fontSize: 13, fontWeight: '800', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8,
  },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: -4 },
  photoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  photoPreview: { width: 120, height: 72, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  photoActions: { flex: 1, gap: 8 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  photoBtnDanger: { borderColor: `${colors.danger}44` },
  photoBtnTxt: { fontSize: 13, fontWeight: '600', color: colors.primary },
  photoBtnTxtDanger: { color: colors.danger },
  photoEmpty: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 96, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  photoEmptyTxt: { fontSize: 12, color: colors.textMuted },
  schedLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  schedLinkIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center',
  },
  schedLinkBody: { flex: 1, gap: 2 },
  schedLinkTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  schedLinkSub: { fontSize: 12, color: colors.textMuted },
});
