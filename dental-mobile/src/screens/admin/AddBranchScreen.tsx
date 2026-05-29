import React, { useState } from 'react';
import {
  StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { branchService } from '../../services/branch.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { FormSection } from '../../components/FormSection';
import { colors, spacing } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import type { BillingStackParamList } from '../../types';

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

export default function AddBranchScreen() {
  const navigation = useNavigation<Nav>();
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
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
      const branch = await branchService.create({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        latitude: lat !== undefined && !isNaN(lat) ? lat : undefined,
        longitude: lng !== undefined && !isNaN(lng) ? lng : undefined,
        map_url: form.map_url.trim() || undefined,
        book_now_url: form.book_now_url.trim() || undefined,
      });
      Alert.alert('Saved', 'Branch created. Set scheduling and photo from branch details.', [
        { text: 'OK', onPress: () => navigation.replace('EditBranch', { branchId: branch.id }) },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Add branch" subtitle="New clinic location" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]} keyboardShouldPersistTaps="handled">
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

          <Button title="Create branch" onPress={handleSave} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: -4 },
});
