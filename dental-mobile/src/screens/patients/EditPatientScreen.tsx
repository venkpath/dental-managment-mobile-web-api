import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, StyleSheet } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { patientService } from '../../services/patient.service';
import { branchService } from '../../services/branch.service';
import Input from '../../components/Input';
import Button from '../../components/Button';
import PatientPhoneInput from '../../components/PatientPhoneInput';
import FormScreenLayout, { FormCard, formInputWrap } from '../../components/FormScreenLayout';
import DatePickerInput from '../../components/DatePickerInput';
import SelectSheet from '../../components/SelectSheet';
import { SelectField } from '../../components/FormSection';
import { BLOOD_GROUPS } from '../../constants/patientForm';
import { parseStoredPhone, isValidPhoneForCountry, toE164FromCountry } from '../../utils/phone';
import type { CountryDial } from '../../utils/countryCodes';
import { formUi, APP_C } from '../../theme/appChrome';
import type { Branch, PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'EditPatient'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const;

type Gender = 'Male' | 'Female' | 'Other';

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow access to your photo library.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

export default function EditPatientScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { patientId } = route.params;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchSheet, setBranchSheet] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<CountryDial>(parseStoredPhone('').country);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    gender: '' as Gender | '',
    date_of_birth: '',
    age: '',
    blood_group: '', allergies: '', notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => {
    setFetching(true);
    Promise.all([patientService.get(patientId), branchService.list()])
      .then(([p, list]) => {
        setBranches(list);
        const parsed = parseStoredPhone(p.phone);
        setPhoneCountry(parsed.country);
        setPhoneLocal(parsed.local);
        setSelectedBranchId(p.branch_id ?? p.branch?.id ?? list[0]?.id ?? '');
        if (p.profile_photo_url) setProfilePreview(p.profile_photo_url);
        setForm({
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email ?? '',
          gender: (p.gender as Gender) ?? '',
          date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
          age: p.age ? String(p.age) : '',
          blood_group: p.blood_group ?? '',
          allergies: p.allergies ?? '',
          notes: p.notes ?? '',
        });
      })
      .finally(() => setFetching(false));
  }, [patientId]));

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!phoneLocal.trim()) e.phone = 'Required';
    else if (!isValidPhoneForCountry(phoneLocal, phoneCountry)) {
      e.phone = `Enter a valid ${phoneCountry.minLength}${phoneCountry.minLength !== phoneCountry.maxLength ? `–${phoneCountry.maxLength}` : ''}-digit number`;
    }
    if (!form.gender) e.gender = 'Please select a gender';
    if (!selectedBranchId) e.branch_id = 'Select a branch';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: toE164FromCountry(phoneLocal, phoneCountry),
        gender: form.gender,
        branch_id: selectedBranchId,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
      if (form.age.trim() && !form.date_of_birth) payload.age = parseInt(form.age.trim(), 10);
      if (form.blood_group) payload.blood_group = form.blood_group;
      if (form.allergies.trim()) payload.allergies = form.allergies.trim();
      payload.notes = form.notes.trim();

      await patientService.update(patientId, payload as Parameters<typeof patientService.update>[1]);

      if (profilePhotoFile) {
        try {
          const res = await patientService.uploadProfilePhoto(patientId, profilePhotoFile);
          setProfilePreview(res.profile_photo_url);
          setProfilePhotoFile(null);
        } catch {
          Alert.alert('Partial success', 'Patient updated, but profile photo upload failed.');
        }
      }

      Alert.alert('Saved', 'Patient details updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const branchLabel = branches.find((b) => b.id === selectedBranchId)?.name ?? '';

  return (
    <FormScreenLayout
      title="Edit patient"
      subtitle="Update patient profile"
      onBack={() => navigation.goBack()}
      booting={fetching}
      primaryAction={{ label: 'Save changes', onPress: handleSave, loading }}
    >
      <FormCard title="Profile photo">
        <View style={photoStyles.row}>
          {profilePreview ? (
            <Image source={{ uri: profilePreview }} style={photoStyles.avatar} />
          ) : (
            <View style={photoStyles.placeholder}>
              <Text style={photoStyles.initials}>
                {(form.first_name[0] ?? '') + (form.last_name[0] ?? '') || '?'}
              </Text>
            </View>
          )}
          <View style={photoStyles.actions}>
            <Button title="Change photo" variant="outline" size="sm" onPress={async () => {
              const file = await pickImage();
              if (!file) return;
              setProfilePhotoFile(file);
              setProfilePreview(file.uri);
            }} />
            {profilePreview ? (
              <Button title="Remove" variant="ghost" size="sm" onPress={() => {
                Alert.alert('Remove photo', 'Remove profile photo?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await patientService.deleteProfilePhoto(patientId);
                        setProfilePreview(null);
                        setProfilePhotoFile(null);
                      } catch (err: unknown) {
                        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove photo');
                      }
                    },
                  },
                ]);
              }} />
            ) : null}
          </View>
        </View>
      </FormCard>

      <FormCard title="Basic information">
        {branches.length > 1 ? (
          <SelectField
            label="Branch *"
            value={branchLabel}
            placeholder="Select branch"
            error={errors.branch_id}
            onPress={() => setBranchSheet(true)}
          />
        ) : null}
        <View style={formUi.row2}>
          <Input label="First name *" value={form.first_name} onChangeText={(v) => set('first_name', v)}
            error={errors.first_name} containerStyle={[formInputWrap.tight, formUi.half]} />
          <Input label="Last name *" value={form.last_name} onChangeText={(v) => set('last_name', v)}
            error={errors.last_name} containerStyle={[formInputWrap.tight, formUi.half]} />
        </View>
        <View style={formInputWrap.tight}>
          <PatientPhoneInput
            country={phoneCountry}
            local={phoneLocal}
            onCountryChange={setPhoneCountry}
            onLocalChange={(v) => { setPhoneLocal(v); setErrors((p) => ({ ...p, phone: '' })); }}
            error={errors.phone}
          />
        </View>
        <Input label="Email" value={form.email} onChangeText={(v) => set('email', v)}
          keyboardType="email-address" autoCapitalize="none" containerStyle={formInputWrap.tight} />
      </FormCard>

      <FormCard title="Patient details">
        <View>
          <Text style={formUi.fieldLabel}>Gender *</Text>
          <View style={formUi.pillRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[formUi.pill, form.gender === g.value && formUi.pillActive]}
                onPress={() => set('gender', g.value)}
                activeOpacity={0.7}
              >
                <Text style={[formUi.pillTxt, form.gender === g.value && formUi.pillTxtActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.gender ? <Text style={formUi.errorTxt}>{errors.gender}</Text> : null}
        </View>

        <DatePickerInput
          label="Date of birth"
          value={form.date_of_birth}
          maxDate={new Date()}
          showAge
          onChange={(v) => { set('date_of_birth', v); set('age', ''); }}
        />

        {!form.date_of_birth && (
          <Input label="Age (if DOB unknown)" value={form.age} onChangeText={(v) => set('age', v)}
            placeholder="e.g. 35" keyboardType="number-pad" maxLength={3} containerStyle={formInputWrap.tight} />
        )}

        <Text style={[formUi.fieldLabel, { marginTop: 8 }]}>Blood group</Text>
        <View style={formUi.pillRow}>
          {BLOOD_GROUPS.map((bg) => (
            <TouchableOpacity
              key={bg}
              style={[formUi.pill, form.blood_group === bg && formUi.pillActive]}
              onPress={() => set('blood_group', form.blood_group === bg ? '' : bg)}
              activeOpacity={0.7}
            >
              <Text style={[formUi.pillTxt, form.blood_group === bg && formUi.pillTxtActive]}>{bg}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Allergies" value={form.allergies} onChangeText={(v) => set('allergies', v)}
          containerStyle={formInputWrap.tight} />
        <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)}
          multiline numberOfLines={3} textAlignVertical="top"
          style={{ minHeight: 80, paddingTop: 8 }} containerStyle={formInputWrap.tight} />
      </FormCard>

      <SelectSheet
        visible={branchSheet}
        title="Branch"
        options={branches.map((b) => ({ value: b.id, label: b.name }))}
        selectedValue={selectedBranchId}
        onSelect={setSelectedBranchId}
        onClose={() => setBranchSheet(false)}
      />
    </FormScreenLayout>
  );
}

const photoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  placeholder: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: APP_C.indigoLight,
    alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontSize: 20, fontWeight: '700', color: APP_C.indigo },
  actions: { flex: 1, gap: 4 },
});
