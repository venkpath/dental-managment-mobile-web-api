import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import { userService, type StaffUser } from '../../services/user.service';
import SelectSheet from '../../components/SelectSheet';
import { useBottomInset } from '../../hooks/useBottomInset';
import { C, GST_RE } from './_invoiceTheme';
import type { BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'EditInvoice'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

export default function EditInvoiceScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { invoiceId } = route.params;

  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [dentistId, setDentistId] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [dentistSheet, setDentistSheet] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([invoiceService.get(invoiceId), userService.listStaff()])
      .then(([inv, staff]) => {
        const onlyDentists = staff.filter((u) => /dentist|consultant/i.test(u.role));
        setDentists(onlyDentists.length > 0 ? onlyDentists : staff);
        setDentistId(inv.dentist?.id ?? '');
        setGstNumber(inv.gst_number ?? '');
        setInvoiceNo(inv.invoice_number ?? inv.id.slice(0, 8));
      })
      .catch(() => Alert.alert('Error', 'Could not load invoice'))
      .finally(() => setBooting(false));
  }, [invoiceId]));

  const validate = () => {
    const e: Record<string, string> = {};
    if (gstNumber.trim() && !GST_RE.test(gstNumber.trim().toUpperCase())) {
      e.gst_number = 'Enter a valid 15-character GSTIN';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await invoiceService.update(invoiceId, {
        dentist_id: dentistId || null,
        gst_number: gstNumber.trim().toUpperCase() || undefined,
      });
      Alert.alert('Saved', 'Invoice updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <View style={[ui.screen, { paddingTop: insets.top }]}>
        <View style={ui.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top, backgroundColor: C.bg }}>
        <View style={ui.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ui.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ui.topTitle}>Edit invoice</Text>
            <Text style={ui.topSub} numberOfLines={1}>#{invoiceNo}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + bottomInset, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={ui.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={C.indigo} />
          <Text style={ui.infoTxt}>
            Line items, payments, and totals are managed on the invoice detail screen. Here you can update the treating dentist and GST number (same as web).
          </Text>
        </View>

        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Invoice metadata</Text>
          <Text style={ui.fieldLabel}>Treating dentist</Text>
          <TouchableOpacity style={ui.field} onPress={() => setDentistSheet(true)} activeOpacity={0.7}>
            <Text style={ui.fieldTxt}>
              {dentists.find((d) => d.id === dentistId)?.name ?? '— None —'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>

          <Text style={[ui.fieldLabel, { marginTop: 12 }]}>GST number</Text>
          <TextInput
            value={gstNumber}
            onChangeText={setGstNumber}
            autoCapitalize="characters"
            placeholder="22AAAAA0000A1Z5"
            placeholderTextColor={C.textMuted}
            style={[ui.inputBox, errors.gst_number && ui.inputError]}
          />
          {errors.gst_number ? <Text style={ui.errorTxt}>{errors.gst_number}</Text> : null}
        </View>
      </ScrollView>

      <View style={[ui.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity
          style={[ui.primaryBtn, loading && ui.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryTxt}>Save changes</Text>}
        </TouchableOpacity>
      </View>

      <SelectSheet
        visible={dentistSheet}
        title="Treating dentist"
        options={[{ value: '', label: '— None —' }, ...dentists.map((d) => ({ value: d.id, label: d.name }))]}
        selectedValue={dentistId}
        onSelect={setDentistId}
        onClose={() => setDentistSheet(false)}
      />
    </KeyboardAvoidingView>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  topTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  topSub: { fontSize: 12, color: C.textSub, marginTop: 1 },
  infoCard: {
    flexDirection: 'row', gap: 10, backgroundColor: C.indigoLight, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#c7d2fe',
  },
  infoTxt: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', minHeight: 48,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, backgroundColor: C.bg, gap: 8,
  },
  fieldTxt: { flex: 1, fontSize: 15, color: C.text },
  inputBox: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text, backgroundColor: C.bg,
  },
  inputError: { borderColor: C.red },
  errorTxt: { fontSize: 12, color: C.red, marginTop: 4 },
  footer: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  primaryBtn: {
    backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  primaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
});
