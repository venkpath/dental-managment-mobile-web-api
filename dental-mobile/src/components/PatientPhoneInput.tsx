import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountryCodePicker from './CountryCodePicker';
import type { CountryDial } from '../utils/countryCodes';
import { APP_C } from '../theme/appChrome';

type Props = {
  label?: string;
  country: CountryDial;
  local: string;
  onCountryChange: (c: CountryDial) => void;
  onLocalChange: (v: string) => void;
  error?: string;
};

export default function PatientPhoneInput({
  label = 'Mobile number *',
  country,
  local,
  onCountryChange,
  onLocalChange,
  error,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={[s.row, error && s.rowError]}>
        <TouchableOpacity style={s.cc} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={s.flag}>{country.flag}</Text>
          <Text style={s.dial}>+{country.dial}</Text>
          <Ionicons name="chevron-down" size={14} color={APP_C.indigo} />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={local}
          onChangeText={onLocalChange}
          placeholder={country.placeholder}
          placeholderTextColor={APP_C.textMuted}
          keyboardType="phone-pad"
          maxLength={country.maxLength}
        />
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <CountryCodePicker
        visible={pickerOpen}
        selected={country}
        onSelect={onCountryChange}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: APP_C.textSub, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_C.border,
    borderRadius: 12,
    backgroundColor: APP_C.bg,
    minHeight: 48,
  },
  rowError: { borderColor: APP_C.red },
  cc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: APP_C.border,
  },
  flag: { fontSize: 18 },
  dial: { fontSize: 14, fontWeight: '600', color: APP_C.text },
  input: { flex: 1, fontSize: 15, color: APP_C.text, paddingHorizontal: 12, paddingVertical: 10 },
  error: { fontSize: 12, color: APP_C.red, marginTop: 4 },
});
