import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  Switch,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import { treatmentService } from '../../services/treatment.service';
import { userService, type StaffUser } from '../../services/user.service';
import { insuranceService, type PatientInsurance } from '../../services/insurance.service';
import { patientService } from '../../services/patient.service';
import SelectSheet from '../../components/SelectSheet';
import PatientSearchInput from '../../components/PatientSearchInput';
import DatePickerInput from '../../components/DatePickerInput';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';
import { useAuthStore } from '../../store/auth.store';
import { useBottomInset } from '../../hooks/useBottomInset';
import { C, GST_RE, COVERAGE_CATEGORIES, ITEM_TYPE_OPTIONS } from './_invoiceTheme';
import type { BillingStackParamList, Treatment, CoverageCategory } from '../../types';

type Route = RouteProp<BillingStackParamList, 'QuickInvoice'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

type ItemType = 'treatment' | 'service' | 'pharmacy';

interface LineItem {
  item_type: ItemType;
  description: string;
  quantity: string;
  unit_price: string;
  treatment_id?: string;
  coverage_category: string;
}

const emptyItem = (): LineItem => ({
  item_type: 'service',
  description: '',
  quantity: '1',
  unit_price: '',
  coverage_category: '',
});

export default function QuickInvoiceScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { branchId } = useAuthStore();

  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [patientError, setPatientError] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState('18');
  const [gstNumber, setGstNumber] = useState('');
  const [gstError, setGstError] = useState('');
  const [treatmentDate, setTreatmentDate] = useState('');
  const [dentistId, setDentistId] = useState('');
  const [dentists, setDentists] = useState<StaffUser[]>([]);
  const [asDraft, setAsDraft] = useState(false);
  const [patientInsurances, setPatientInsurances] = useState<PatientInsurance[]>([]);
  const [insuranceId, setInsuranceId] = useState('');
  const [loading, setLoading] = useState(false);

  const [dentistSheet, setDentistSheet] = useState(false);
  const [insuranceSheet, setInsuranceSheet] = useState(false);
  const [coverageSheetIndex, setCoverageSheetIndex] = useState<number | null>(null);

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [treatmentModalIndex, setTreatmentModalIndex] = useState<number | null>(null);

  useEffect(() => {
    userService.listStaff().then((staff) => {
      const only = staff.filter((u) => /dentist|consultant/i.test(u.role));
      setDentists(only.length > 0 ? only : staff);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const pid = route.params?.patientId;
    if (!pid) return;
    patientService.get(pid).then((p) => {
      setSelectedPatient({ id: p.id, name: `${p.first_name} ${p.last_name}` });
    }).catch(() => {});
  }, [route.params?.patientId]);

  useEffect(() => {
    if (!selectedPatient?.id) {
      setPatientInsurances([]);
      setInsuranceId('');
      return;
    }
    insuranceService.listForPatient(selectedPatient.id).then((list) => {
      const active = list.filter((e) => e.is_active !== false);
      setPatientInsurances(active);
      if (active.length === 1) setInsuranceId(active[0].id);
    }).catch(() => setPatientInsurances([]));
  }, [selectedPatient?.id]);

  const fetchTreatments = useCallback(async (patientId: string) => {
    setLoadingTreatments(true);
    try {
      setTreatments(await treatmentService.listByPatient(patientId));
    } catch {
      setTreatments([]);
    } finally {
      setLoadingTreatments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatient?.id) fetchTreatments(selectedPatient.id);
    else setTreatments([]);
  }, [selectedPatient, fetchTreatments]);

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const setItemType = (index: number, type: ItemType) => {
    setItems((prev) => prev.map((it, i) =>
      i === index ? { ...it, item_type: type, description: '', unit_price: '', treatment_id: undefined } : it,
    ));
  };

  const selectTreatment = (index: number, treatment: Treatment) => {
    setItems((prev) => prev.map((it, i) =>
      i === index ? {
        ...it,
        description: treatment.procedure,
        unit_price: String(Number(treatment.cost)),
        treatment_id: treatment.id,
      } : it,
    ));
    setTreatmentModalIndex(null);
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    return sum + qty * price;
  }, 0);
  const discountAmt = parseFloat(discount) || 0;
  const taxRate = parseFloat(gst) || 0;
  const taxableBase = Math.max(0, subtotal - discountAmt);
  const taxAmount = Math.round(taxableBase * (taxRate / 100) * 100) / 100;
  const grandTotal = taxableBase + taxAmount;

  const insuranceLabel = () => {
    if (!insuranceId) return '— No insurance billing —';
    const e = patientInsurances.find((x) => x.id === insuranceId);
    if (!e) return 'Select enrollment';
    const prov = e.provider?.name ?? e.provider?.short_code ?? 'Insurance';
    const plan = e.plan?.plan_name ? ` · ${e.plan.plan_name}` : '';
    return `${prov}${plan}`;
  };

  const validate = () => {
    if (!selectedPatient?.id) {
      setPatientError('Select a patient');
      return false;
    }
    setPatientError('');
    if (!branchId) {
      Alert.alert('Error', 'No branch assigned to your account.');
      return false;
    }
    const gstTrim = gstNumber.trim().toUpperCase();
    if (gstTrim && !GST_RE.test(gstTrim)) {
      setGstError('Enter a valid 15-character GSTIN');
      return false;
    }
    setGstError('');
    for (const it of items) {
      if (!it.description.trim() || !it.unit_price) {
        Alert.alert('Line items', 'Fill description and unit price for every item.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (draft: boolean) => {
    if (!validate()) return;
    setLoading(true);
    try {
      const invoice = await invoiceService.create({
        patient_id: selectedPatient!.id,
        branch_id: branchId!,
        as_draft: draft,
        ...(dentistId && { dentist_id: dentistId }),
        ...(gstNumber.trim() && { gst_number: gstNumber.trim().toUpperCase() }),
        ...(treatmentDate && { treatment_date: treatmentDate }),
        ...(discountAmt > 0 && { discount_amount: discountAmt }),
        ...(taxRate > 0 && { tax_percentage: taxRate }),
        ...(insuranceId && { patient_insurance_id: insuranceId }),
        items: items.map((it) => ({
          item_type: it.item_type,
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          ...(it.treatment_id && { treatment_id: it.treatment_id }),
          ...(it.coverage_category && { coverage_category: it.coverage_category as CoverageCategory }),
        })),
      });
      const title = draft ? 'Draft saved' : 'Invoice created';
      const msg = draft
        ? `Draft ${invoice.invoice_number} saved. Issue it from detail when ready.`
        : `Invoice ${invoice.invoice_number} created successfully.`;
      Alert.alert(title, msg, [
        { text: 'View', onPress: () => navigation.replace('InvoiceDetail', { invoiceId: invoice.id }) },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top, backgroundColor: C.bg }}>
        <View style={ui.topbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={ui.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ui.topTitle}>New invoice</Text>
            <Text style={ui.topSub}>Create billing for a patient</Text>
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + bottomInset, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Patient</Text>
          <PatientSearchInput
            selectedPatient={selectedPatient}
            onSelect={(p) => { setSelectedPatient(p.id ? p : null); setPatientError(''); }}
            error={patientError}
          />
        </View>

        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Billing details</Text>
          <Text style={ui.fieldLabel}>Treating dentist</Text>
          <TouchableOpacity style={ui.field} onPress={() => setDentistSheet(true)} activeOpacity={0.7}>
            <Text style={[ui.fieldTxt, !dentistId && ui.placeholder]}>
              {dentists.find((d) => d.id === dentistId)?.name ?? '— None —'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>

          <Text style={[ui.fieldLabel, { marginTop: 12 }]}>GST number</Text>
          <TextInput
            value={gstNumber}
            onChangeText={(v) => { setGstNumber(v); setGstError(''); }}
            placeholder="e.g. 29ABCDE1234F1Z5"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            style={[ui.inputBox, gstError && ui.inputError]}
          />
          {gstError ? <Text style={ui.errorTxt}>{gstError}</Text> : null}

          <View style={{ marginTop: 12 }}>
            <DatePickerInput label="Treatment date" value={treatmentDate} onChange={setTreatmentDate} />
          </View>
          <Text style={ui.hint}>Optional — when treatment was rendered on a different day.</Text>

          {patientInsurances.length > 0 && (
            <>
              <Text style={[ui.fieldLabel, { marginTop: 12 }]}>Bill under insurance</Text>
              <TouchableOpacity style={ui.field} onPress={() => setInsuranceSheet(true)} activeOpacity={0.7}>
                <Text style={ui.fieldTxt} numberOfLines={2}>{insuranceLabel()}</Text>
                <Ionicons name="chevron-down" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </>
          )}

          <View style={ui.draftRow}>
            <View style={{ flex: 1 }}>
              <Text style={ui.draftTitle}>Save as draft</Text>
              <Text style={ui.hint}>Drafts are not sent to patients until issued from detail.</Text>
            </View>
            <Switch value={asDraft} onValueChange={setAsDraft} trackColor={{ true: C.indigo }} />
          </View>
        </View>

        <View style={ui.card}>
          <View style={ui.lineHead}>
            <Text style={ui.sectionLabel}>Line items</Text>
            <TouchableOpacity onPress={addItem} style={ui.addLink} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={18} color={C.indigo} />
              <Text style={ui.addLinkTxt}>Add item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={[ui.lineCard, index > 0 && { marginTop: 12 }]}>
              <View style={ui.itemTop}>
                <Text style={ui.itemNum}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(index)} activeOpacity={0.7}>
                    <Text style={ui.removeTxt}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={ui.typeRow}>
                {ITEM_TYPE_OPTIONS.map((t) => {
                  const active = item.item_type === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      style={[ui.typeBtn, active && ui.typeBtnOn]}
                      onPress={() => setItemType(index, t.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={t.icon} size={14} color={active ? C.indigo : C.textMuted} />
                      <Text style={[ui.typeTxt, active && ui.typeTxtOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {item.item_type === 'treatment' && (
                <TouchableOpacity
                  style={[ui.pickBtn, item.treatment_id && ui.pickBtnOn]}
                  onPress={() => {
                    if (!selectedPatient?.id) {
                      Alert.alert('Select patient', 'Choose a patient to pick treatments.');
                      return;
                    }
                    setTreatmentModalIndex(index);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="medical-outline" size={18} color={item.treatment_id ? C.indigo : C.textMuted} />
                  <Text style={[ui.pickTxt, item.treatment_id && ui.pickTxtOn]} numberOfLines={1}>
                    {item.treatment_id ? (item.description || 'Treatment selected') : 'Select from patient treatments'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={C.textMuted} />
                </TouchableOpacity>
              )}

              {(item.item_type !== 'treatment' || item.treatment_id) && (
                <>
                  <Text style={ui.fieldLabel}>Description *</Text>
                  <TextInput
                    value={item.description}
                    onChangeText={(v) => updateItem(index, 'description', v)}
                    placeholder={item.item_type === 'pharmacy' ? 'e.g. Paracetamol 500mg' : 'e.g. Consultation fee'}
                    placeholderTextColor={C.textMuted}
                    style={ui.inputBox}
                  />
                </>
              )}

              {insuranceId && (
                <>
                  <Text style={ui.fieldLabel}>Coverage category</Text>
                  <TouchableOpacity
                    style={ui.field}
                    onPress={() => setCoverageSheetIndex(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={ui.fieldTxt}>
                      {COVERAGE_CATEGORIES.find((c) => c.value === item.coverage_category)?.label ?? 'Default (basic)'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </>
              )}

              <View style={ui.qtyRow}>
                <View style={{ width: 80 }}>
                  <Text style={ui.fieldLabel}>Qty</Text>
                  <TextInput
                    value={item.quantity}
                    onChangeText={(v) => updateItem(index, 'quantity', v)}
                    keyboardType="decimal-pad"
                    style={ui.inputBox}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ui.fieldLabel}>Unit price ({getCurrencySymbol()}) *</Text>
                  <TextInput
                    value={item.unit_price}
                    onChangeText={(v) => updateItem(index, 'unit_price', v)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={C.textMuted}
                    style={ui.inputBox}
                  />
                </View>
              </View>
              {item.description && item.unit_price ? (
                <Text style={ui.lineSub}>
                  Line total: {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={ui.card}>
          <Text style={ui.sectionLabel}>Totals</Text>
          <View style={ui.qtyRow}>
            <View style={{ flex: 1 }}>
              <Text style={ui.fieldLabel}>Discount ({getCurrencySymbol()})</Text>
              <TextInput
                value={discount}
                onChangeText={setDiscount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.textMuted}
                style={ui.inputBox}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.fieldLabel}>GST / tax (%)</Text>
              <TextInput
                value={gst}
                onChangeText={setGst}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.textMuted}
                style={ui.inputBox}
              />
            </View>
          </View>
          <View style={ui.totalsBox}>
            <View style={ui.totalRow}><Text style={ui.totalLbl}>Subtotal</Text><Text style={ui.totalVal}>{formatCurrency(subtotal)}</Text></View>
            {discountAmt > 0 && (
              <View style={ui.totalRow}>
                <Text style={ui.totalLbl}>Discount</Text>
                <Text style={[ui.totalVal, { color: C.green }]}>-{formatCurrency(discountAmt)}</Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View style={ui.totalRow}>
                <Text style={ui.totalLbl}>GST ({taxRate}%)</Text>
                <Text style={ui.totalVal}>+{formatCurrency(taxAmount)}</Text>
              </View>
            )}
            <View style={[ui.totalRow, ui.grandRow]}>
              <Text style={ui.grandLbl}>Total</Text>
              <Text style={ui.grandVal}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[ui.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
        {asDraft ? (
          <TouchableOpacity
            style={[ui.primaryBtn, loading && ui.btnDisabled]}
            onPress={() => handleSubmit(true)}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryTxt}>Save draft</Text>}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[ui.outlineBtn, loading && ui.btnDisabled]}
              onPress={() => setAsDraft(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={ui.outlineTxt}>Save as draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ui.primaryBtn, { flex: 1 }, loading && ui.btnDisabled]}
              onPress={() => handleSubmit(false)}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryTxt}>Create invoice</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      <SelectSheet
        visible={dentistSheet}
        title="Treating dentist"
        options={[{ value: '', label: '— None —' }, ...dentists.map((d) => ({ value: d.id, label: d.name }))]}
        selectedValue={dentistId}
        onSelect={setDentistId}
        onClose={() => setDentistSheet(false)}
      />

      <SelectSheet
        visible={insuranceSheet}
        title="Insurance enrollment"
        options={[
          { value: '', label: '— Cash / self-pay —' },
          ...patientInsurances.map((e) => ({
            value: e.id,
            label: `${e.provider?.name ?? 'Plan'}${e.plan?.plan_name ? ` · ${e.plan.plan_name}` : ''}`,
          })),
        ]}
        selectedValue={insuranceId}
        onSelect={setInsuranceId}
        onClose={() => setInsuranceSheet(false)}
      />

      <SelectSheet
        visible={coverageSheetIndex !== null}
        title="Coverage category"
        options={COVERAGE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        selectedValue={coverageSheetIndex !== null ? items[coverageSheetIndex]?.coverage_category ?? '' : ''}
        onSelect={(v) => {
          if (coverageSheetIndex !== null) updateItem(coverageSheetIndex, 'coverage_category', v);
        }}
        onClose={() => setCoverageSheetIndex(null)}
      />

      <Modal visible={treatmentModalIndex !== null} animationType="slide" transparent onRequestClose={() => setTreatmentModalIndex(null)}>
        <Pressable style={ui.modalBg} onPress={() => setTreatmentModalIndex(null)}>
          <Pressable style={ui.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={ui.modalHead}>
              <Text style={ui.modalTitle}>Select treatment</Text>
              <TouchableOpacity onPress={() => setTreatmentModalIndex(null)}>
                <Ionicons name="close" size={22} color={C.textSub} />
              </TouchableOpacity>
            </View>
            {loadingTreatments ? (
              <View style={ui.modalCenter}><ActivityIndicator color={C.indigo} /></View>
            ) : treatments.length === 0 ? (
              <View style={ui.modalCenter}>
                <Text style={ui.modalEmpty}>No treatments for this patient</Text>
                <TouchableOpacity onPress={() => setTreatmentModalIndex(null)} style={ui.modalLink}>
                  <Text style={ui.modalLinkTxt}>Enter manually</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={treatments}
                keyExtractor={(t) => t.id}
                renderItem={({ item: t }) => (
                  <TouchableOpacity
                    style={ui.treatRow}
                    onPress={() => treatmentModalIndex !== null && selectTreatment(treatmentModalIndex, t)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={ui.treatName}>{t.procedure}</Text>
                      <Text style={ui.treatMeta}>
                        {t.tooth_number ? `Tooth ${t.tooth_number} · ` : ''}{t.status}
                      </Text>
                    </View>
                    <Text style={ui.treatCost}>{formatCurrency(Number(t.cost))}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={ui.sep} />}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  topTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  topSub: { fontSize: 12, color: C.textSub, marginTop: 1 },
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
  placeholder: { color: C.textMuted },
  inputBox: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text, backgroundColor: C.bg,
  },
  inputError: { borderColor: C.red },
  errorTxt: { fontSize: 12, color: C.red, marginTop: 4 },
  hint: { fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 17 },
  draftRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  draftTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addLinkTxt: { fontSize: 13, fontWeight: '700', color: C.indigo },
  lineCard: { backgroundColor: C.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.divider },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemNum: { fontSize: 13, fontWeight: '700', color: C.text },
  removeTxt: { fontSize: 13, fontWeight: '600', color: C.red },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  typeBtnOn: { borderColor: C.indigo, backgroundColor: C.indigoLight },
  typeTxt: { fontSize: 11, fontWeight: '600', color: C.textSub },
  typeTxtOn: { color: C.indigo },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48,
    borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 10, backgroundColor: C.surface,
  },
  pickBtnOn: { borderColor: C.indigo, backgroundColor: C.indigoLight },
  pickTxt: { flex: 1, fontSize: 14, color: C.textMuted },
  pickTxtOn: { color: C.indigo, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  lineSub: { fontSize: 13, fontWeight: '600', color: C.indigo, textAlign: 'right', marginTop: 6 },
  totalsBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.divider, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLbl: { fontSize: 14, color: C.textSub },
  totalVal: { fontSize: 14, fontWeight: '600', color: C.text },
  grandRow: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  grandLbl: { fontSize: 16, fontWeight: '800', color: C.text },
  grandVal: { fontSize: 16, fontWeight: '800', color: C.indigo },
  footer: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  primaryBtn: {
    backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  outlineBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
  },
  outlineTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
  primaryTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '72%' },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  modalCenter: { padding: 32, alignItems: 'center', gap: 12 },
  modalEmpty: { color: C.textSub, textAlign: 'center' },
  modalLink: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: C.indigoLight, borderRadius: 10 },
  modalLinkTxt: { color: C.indigo, fontWeight: '700' },
  treatRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  treatName: { fontSize: 15, fontWeight: '600', color: C.text },
  treatMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  treatCost: { fontSize: 15, fontWeight: '700', color: C.indigo },
  sep: { height: 1, backgroundColor: C.divider, marginHorizontal: 16 },
});
