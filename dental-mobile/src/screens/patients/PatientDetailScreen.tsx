import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import { appointmentService } from '../../services/appointment.service';
import { treatmentService } from '../../services/treatment.service';
import { prescriptionService, type Prescription } from '../../services/prescription.service';
import { clinicalService, type ClinicalVisit, type TreatmentPlan } from '../../services/clinical.service';
import { membershipsService, type PatientMembershipSummary } from '../../services/memberships.service';
import { insuranceService, type PatientInsurance } from '../../services/insurance.service';
import { consentsService, type PatientConsent } from '../../services/consents.service';
import { formatCurrency } from '../../utils/format';
import { useBottomInset } from '../../hooks/useBottomInset';
import { ClinicalTab } from './_components/ClinicalTab';
import { AppointmentsTab } from './_components/AppointmentsTab';
import { MoreTab } from './_components/MoreTab';
import type { Patient, Appointment, Treatment, PatientStackParamList } from '../../types';

type Route = RouteProp<PatientStackParamList, 'PatientDetail'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

// ─── Tab list ────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'clinical' | 'appointments' | 'chart' | 'ai' | 'more';

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { id: 'overview',     label: 'Overview',     icon: 'home' },
  { id: 'clinical',     label: 'Clinical',     icon: 'medkit' },
  { id: 'appointments', label: 'Appointments', icon: 'calendar' },
  { id: 'chart',        label: 'Dental Chart', icon: 'grid' },
  { id: 'ai',           label: 'AI Notes',     icon: 'sparkles' },
  { id: 'more',         label: 'More',         icon: 'ellipsis-horizontal' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function avatarPalette(g?: string): { bg: string; text: string } {
  if (g === 'Female') return { bg: '#FCE7F3', text: '#BE185D' };
  if (g === 'Other')  return { bg: '#F1F5F9', text: '#64748B' };
  return { bg: '#E0E7FF', text: '#4F46E5' };
}

function genderStyle(g?: string) {
  if (g === 'Female') return { bg: '#FCE7F3', text: '#DB2777' };
  if (g === 'Other')  return { bg: '#F1F5F9', text: '#64748B' };
  return { bg: '#DBEAFE', text: '#2563EB' };
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s()-]/g, '');
  const m = cleaned.match(/^(\+91)(\d{5})(\d{5})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return phone;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function computeAge(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function visitStatusStyle(status?: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'finalized': return { bg: '#DCFCE7', text: '#15803D', label: 'finalized' };
    case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626', label: 'cancelled' };
    default:          return { bg: '#FEF3C7', text: '#B45309', label: 'in progress' };
  }
}

function appointmentStatusStyle(status: string) {
  switch (status) {
    case 'scheduled': return { bg: '#DBEAFE', text: '#2563EB', label: 'Confirmed' };
    case 'completed': return { bg: '#DCFCE7', text: '#15803D', label: 'Completed' };
    case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' };
    case 'no_show':   return { bg: '#FEF3C7', text: '#B45309', label: 'No Show' };
    default:          return { bg: '#F1F5F9', text: '#64748B', label: status };
  }
}

function shortMonth(date: string) {
  const d = new Date(date);
  const m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return m[d.getMonth()] ?? '';
}

function dayOfMonth(date: string) {
  return new Date(date).getDate();
}

function timeOnly(t?: string) {
  if (!t) return '';
  // backend sends "HH:mm:ss" or "HH:mm"
  const [hh, mm] = t.split(':');
  const h = Number(hh);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${mm ?? '00'} ${ampm}`;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PatientDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { patientId } = route.params;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Patient-detail-wide data (Overview, Clinical, Appointments share)
  const [visits, setVisits] = useState<ClinicalVisit[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // "More" tab data
  const [memberships, setMemberships] = useState<PatientMembershipSummary>({ active: [], past: [] });
  const [insurance, setInsurance] = useState<PatientInsurance[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [moreLoading, setMoreLoading] = useState(true);

  // Load patient
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      patientService.get(patientId)
        .then((p) => setPatient(p))
        .catch(() => setPatient(null))
        .finally(() => setLoading(false));
    }, [patientId])
  );

  // Load patient-wide data once (after patient)
  useEffect(() => {
    if (!patient) return;
    setOverviewLoading(true);
    Promise.all([
      clinicalService.getVisitsByPatient(patientId),
      clinicalService.getTreatmentPlansByPatient(patientId),
      treatmentService.listByPatient(patientId).catch(() => [] as Treatment[]),
      prescriptionService.listByPatient(patientId),
      appointmentService.list({ limit: 100 }).then((r) =>
        (r.data ?? []).filter((a) => a.patient?.id === patientId)
      ).catch(() => [] as Appointment[]),
    ]).then(([vs, plans, ts, rxs, appts]) => {
      setVisits(vs);
      setTreatmentPlans(plans);
      setTreatments(ts);
      setPrescriptions(rxs);
      setAppointments(appts);
    }).finally(() => setOverviewLoading(false));

    // Load "More" tab data in parallel
    setMoreLoading(true);
    Promise.all([
      membershipsService.getPatientSummary(patientId),
      insuranceService.listForPatient(patientId),
      consentsService.listForPatient(patientId),
    ]).then(([m, i, c]) => {
      setMemberships(m);
      setInsurance(i);
      setConsents(c);
    }).finally(() => setMoreLoading(false));
  }, [patient, patientId]);

  // Quick actions handlers
  const callPatient = useCallback(async () => {
    if (!patient?.phone) return;
    const url = `tel:${patient.phone.replace(/\s/g, '')}`;
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
  }, [patient]);

  const sharePatient = useCallback(async () => {
    if (!patient) return;
    try {
      await Share.share({
        message: `Patient: ${patient.first_name} ${patient.last_name}\nPhone: ${patient.phone}${patient.email ? `\nEmail: ${patient.email}` : ''}`,
      });
    } catch {}
  }, [patient]);

  const openMoreMenu = useCallback(() => {
    Alert.alert(
      'More actions',
      undefined,
      [
        { text: 'Edit Patient', onPress: () => navigation.navigate('EditPatient', { patientId }) },
        { text: 'Share', onPress: sharePatient },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (!patient) return;
            Alert.alert(
              'Delete patient?',
              `Permanently delete ${patient.first_name} ${patient.last_name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await patientService.delete(patientId);
                      navigation.goBack();
                    } catch (e) {
                      Alert.alert('Delete failed', (e as Error).message ?? 'Try again');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [navigation, patientId, patient, sharePatient]);

  // ── Loading & error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <SimpleTopBar onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4361EE" />
        </View>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <SimpleTopBar onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ fontSize: 14, color: '#64748b' }}>Patient not found</Text>
        </View>
      </View>
    );
  }

  const fullName = `${patient.first_name} ${patient.last_name}`;
  const initials = `${patient.first_name?.[0] ?? ''}${patient.last_name?.[0] ?? ''}`.toUpperCase();
  const av = avatarPalette(patient.gender);
  const gs = genderStyle(patient.gender);
  const age = patient.age ?? computeAge(patient.date_of_birth);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Patient Profile</Text>
          <Text style={styles.topBreadcrumb}>
            Patients <Text style={{ color: '#cbd5e1' }}>›</Text>{' '}
            <Text style={{ color: '#4361EE' }}>{fullName}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={sharePatient} style={styles.iconBtn}>
          <Ionicons name="share-outline" size={18} color="#0f172a" />
        </TouchableOpacity>
        <TouchableOpacity onPress={openMoreMenu} style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + bottomInset }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]} // makes the tab strip sticky
      >
        {/* ── Hero Card ── */}
        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={[styles.heroAvatar, { backgroundColor: av.bg }]}>
                <Text style={[styles.heroAvatarTxt, { color: av.text }]}>{initials}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.heroName} numberOfLines={1}>{fullName}</Text>
                <Text style={styles.heroSub}>Patient since {formatDate(patient.created_at)}</Text>
                <View style={styles.heroPills}>
                  {patient.gender && (
                    <View style={[styles.pill, { backgroundColor: gs.bg }]}>
                      <Text style={[styles.pillTxt, { color: gs.text }]}>{patient.gender}</Text>
                    </View>
                  )}
                  {age != null && (
                    <View style={[styles.pill, { backgroundColor: '#0f172a' }]}>
                      <Text style={[styles.pillTxt, { color: '#fff' }]}>{age} yrs</Text>
                    </View>
                  )}
                  {patient.blood_group && (
                    <View style={[styles.pill, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="water" size={11} color="#DC2626" />
                      <Text style={[styles.pillTxt, { color: '#DC2626' }]}> {patient.blood_group}</Text>
                    </View>
                  )}
                  {memberships.active && memberships.active.length > 0 ? (
                    <View style={[styles.pill, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="shield-checkmark" size={11} color="#15803D" />
                      <Text style={[styles.pillTxt, { color: '#15803D' }]} numberOfLines={1}>
                        {' '}{memberships.active[0].membership_plan?.name ?? 'Member'}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.pill, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' }]}>
                      <Ionicons name="shield-checkmark-outline" size={11} color="#64748b" />
                      <Text style={[styles.pillTxt, { color: '#64748b' }]}> No Membership</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('EditPatient', { patientId })}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={12} color="#0f172a" />
                <Text style={styles.editTxt}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroFooterLbl}>Phone</Text>
                <TouchableOpacity onPress={callPatient} activeOpacity={0.6}>
                  <View style={styles.heroFooterRow}>
                    <Ionicons name="call" size={12} color="#64748b" />
                    <Text style={styles.heroFooterVal}>{formatPhone(patient.phone)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroFooterLbl}>Branch</Text>
                <View style={styles.heroFooterRow}>
                  <Ionicons name="location" size={12} color="#64748b" />
                  <Text style={styles.heroFooterVal} numberOfLines={1}>{patient.branch?.name ?? '—'}</Text>
                </View>
              </View>
            </View>

            {/* Allergy banner — only if present */}
            {patient.allergies && (
              <View style={styles.allergyBanner}>
                <Ionicons name="warning" size={14} color="#92400E" />
                <Text style={styles.allergyBannerTxt} numberOfLines={2}>
                  <Text style={{ fontWeight: '800' }}>Allergies: </Text>
                  {patient.allergies}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Quick Actions (horizontal scroll) ── */}
        <View style={styles.qaWrap}>
          <Text style={styles.qaLabel}>Quick Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.qaScroll}
          >
            <QAItem icon="medkit"        label="Start"        sub="Consultation" iconBg="#EEF2FF" iconColor="#4F46E5" onPress={() => navigation.navigate('StartConsultation', { patientId, patientName: fullName })} />
            <QAItem icon="calendar"      label="Book"         sub="Appointment"  iconBg="#DBEAFE" iconColor="#2563EB" onPress={() =>
              navigation.getParent()?.navigate('App', {
                screen: 'Appointments',
                params: { screen: 'BookAppointment', params: { patientId } },
              } as never)
            } />
            <QAItem icon="medical"       label="Add"          sub="Treatment"    iconBg="#DCFCE7" iconColor="#15803D" onPress={() =>
              navigation.navigate('AddTreatment', { patientId, patientName: fullName })
            } />
            <QAItem icon="pulse"         label="New"          sub="Prescription" iconBg="#FEF3C7" iconColor="#B45309" onPress={() => navigation.navigate('NewPrescription', { patientId, patientName: fullName })} />
            <QAItem icon="document-text" label="Create"       sub="Invoice"      iconBg="#E0F2FE" iconColor="#0369A1" onPress={() =>
              navigation.getParent()?.navigate('App', {
                screen: 'Billing',
                params: { screen: 'QuickInvoice', params: { patientId } },
              } as never)
            } />
            <QAItem icon="shield-checkmark" label="Enroll"    sub="Membership"   iconBg="#EDE9FE" iconColor="#7C3AED" onPress={() => Alert.alert('Coming soon', 'Enroll Membership will arrive in Wave 3.')} />
          </ScrollView>
        </View>

        {/* ── Sticky tab strip ── */}
        <View style={styles.tabStripWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  onPress={() => setActiveTab(t.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={t.icon} size={14} color={active ? '#4361EE' : '#64748b'} />
                  <Text style={[styles.tabPillTxt, active && styles.tabPillTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <OverviewTab
              loading={overviewLoading}
              visits={visits}
              treatments={treatments}
              prescriptions={prescriptions}
              appointments={appointments}
              onSeeAllAppointments={() => setActiveTab('appointments')}
              onSeeAllClinical={() => setActiveTab('clinical')}
              onOpenVisit={(_id) => { /* TODO Wave 2 detail */ }}
              onOpenTreatment={(_id) => navigation.navigate('PatientTreatments', { patientId, patientName: `${patient.first_name} ${patient.last_name}` })}
              onOpenPrescription={(_id) => navigation.navigate('PatientPrescriptions', { patientId, patientName: `${patient.first_name} ${patient.last_name}` })}
              onOpenAppointment={(id) => navigation.getParent()?.navigate('App', { screen: 'Appointments', params: { screen: 'AppointmentDetail', params: { appointmentId: id } } } as never)}
            />
          )}
          {activeTab === 'clinical' && (
            <ClinicalTab
              loading={overviewLoading}
              visits={visits}
              treatmentPlans={treatmentPlans}
              treatments={treatments}
              prescriptions={prescriptions}
              onStartConsultation={() => navigation.navigate('StartConsultation', { patientId, patientName: fullName })}
              onAddTreatment={() => navigation.navigate('AddTreatment', { patientId, patientName: fullName })}
              onNewPrescription={() => navigation.navigate('NewPrescription', { patientId, patientName: fullName })}
              onOpenVisit={(id) => navigation.navigate('ConsultationDetail', { visitId: id, patientName: fullName })}
              onEditVisit={(id) => navigation.navigate('StartConsultation', { patientId, patientName: fullName, visitId: id })}
              onBookFollowUp={(_id, _date) =>
                navigation.getParent()?.navigate('App', {
                  screen: 'Appointments',
                  params: { screen: 'BookAppointment', params: { patientId } },
                } as never)
              }
              onOpenTreatment={(_id) => navigation.navigate('PatientTreatments', { patientId, patientName: fullName })}
              onOpenPrescription={(_id) => navigation.navigate('PatientPrescriptions', { patientId, patientName: fullName })}
            />
          )}
          {activeTab === 'appointments' && (
            <AppointmentsTab
              loading={overviewLoading}
              appointments={appointments}
              onBook={() =>
                navigation.getParent()?.navigate('App', {
                  screen: 'Appointments',
                  params: { screen: 'BookAppointment', params: { patientId } },
                } as never)
              }
              onOpen={(id) =>
                navigation.getParent()?.navigate('App', {
                  screen: 'Appointments',
                  params: { screen: 'AppointmentDetail', params: { appointmentId: id } },
                } as never)
              }
            />
          )}
          {(activeTab === 'chart' || activeTab === 'ai' || activeTab === 'more') && (
            <ComingSoonPanel tab={TABS.find((t) => t.id === activeTab)?.label ?? ''} wave={3} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Helper components ───────────────────────────────────────────────────────

function SimpleTopBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.topbar}>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
        <Ionicons name="arrow-back" size={20} color="#0f172a" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.topTitle}>Patient Profile</Text>
      </View>
    </View>
  );
}

function QAItem({
  icon, label, sub, iconBg, iconColor, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; sub: string;
  iconBg: string; iconColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.qaItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qaIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.qaLbl}>{label}</Text>
      <Text style={styles.qaSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({
  loading,
  visits,
  treatments,
  prescriptions,
  appointments,
  onSeeAllAppointments,
  onSeeAllClinical,
  onOpenVisit,
  onOpenTreatment,
  onOpenPrescription,
  onOpenAppointment,
}: {
  loading: boolean;
  visits: ClinicalVisit[];
  treatments: Treatment[];
  prescriptions: Prescription[];
  appointments: Appointment[];
  onSeeAllAppointments: () => void;
  onSeeAllClinical: () => void;
  onOpenVisit: (id: string) => void;
  onOpenTreatment: (id: string) => void;
  onOpenPrescription: (id: string) => void;
  onOpenAppointment: (id: string) => void;
}) {
  const now = new Date();
  const upcoming = useMemo(
    () => appointments
      .filter((a) => a.status !== 'cancelled' && new Date(a.appointment_date) >= new Date(now.toDateString()))
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
      .slice(0, 3),
    [appointments, now]
  );

  // Treatment cost summary
  const treatmentSummary = useMemo(() => {
    const active = treatments.filter((t) => t.status !== 'COMPLETED').length;
    const completed = treatments.filter((t) => t.status === 'COMPLETED').length;
    const totalCost = treatments.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
    return { active, completed, totalCost };
  }, [treatments]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#4361EE" />
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {/* ── 1. Consultation History ── */}
      <View>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="reader" size={18} color="#15803D" />
            <Text style={styles.sectionTitle}>Consultation History</Text>
          </View>
          {visits.length > 0 && (
            <TouchableOpacity onPress={onSeeAllClinical}>
              <View style={[styles.countPill, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.countPillTxt, { color: '#15803D' }]}>
                  {visits.length} {visits.length === 1 ? 'Record' : 'Records'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {visits.length === 0 ? (
          <EmptyMini label="No consultations yet" />
        ) : (
          visits.slice(0, 2).map((v) => {
            const st = visitStatusStyle(v.status);
            const summary = v.diagnosis_summary ?? v.chief_complaint;
            return (
              <TouchableOpacity
                key={v.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => onOpenVisit(v.id)}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {v.chief_complaint || 'Consultation'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillTxt, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                {summary && summary !== v.chief_complaint && (
                  <Text style={styles.cardBody} numberOfLines={2}>{summary}</Text>
                )}
                <View style={styles.cardSubRow}>
                  <Ionicons name="calendar-outline" size={12} color="#64748b" />
                  <Text style={styles.cardSubTxt}>{formatDate(v.visit_date ?? v.created_at)}</Text>
                  {v.dentist?.name && (
                    <>
                      <Text style={{ color: '#cbd5e1' }}> · </Text>
                      <Text style={styles.cardSubTxt}>{v.dentist.name}</Text>
                    </>
                  )}
                </View>
                <View style={styles.cardChevron}>
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ── 2. Treatments ── */}
      <View>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="medical" size={18} color="#0369A1" />
            <Text style={styles.sectionTitle}>Treatments</Text>
          </View>
          {treatments.length > 0 && (
            <TouchableOpacity onPress={onSeeAllClinical}>
              <View style={[styles.countPill, { backgroundColor: '#E0F2FE' }]}>
                <Text style={[styles.countPillTxt, { color: '#0369A1' }]}>
                  {treatments.length} Total
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {treatments.length === 0 ? (
          <EmptyMini label="No treatments yet" />
        ) : (
          <>
            {/* Summary tile */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryNumActive}>{treatmentSummary.active}</Text>
                <Text style={styles.summaryLbl}>Active</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryNumDone}>{treatmentSummary.completed}</Text>
                <Text style={styles.summaryLbl}>Completed</Text>
              </View>
              <View style={[styles.summaryTile, { flex: 1.4 }]}>
                <Text style={styles.summaryNumCost} numberOfLines={1}>
                  {formatCurrency(treatmentSummary.totalCost)}
                </Text>
                <Text style={styles.summaryLbl}>Total Cost</Text>
              </View>
            </View>

            {treatments.slice(0, 2).map((t) => {
              const st = treatmentStatusStyle(t.status);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() => onOpenTreatment(t.id)}
                >
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{t.procedure}</Text>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusPillTxt, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                  <View style={styles.cardMetaRow}>
                    {t.tooth_number && (
                      <View style={[styles.metaPill, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={[styles.metaPillTxt, { color: '#4F46E5' }]}>
                          Tooth #{t.tooth_number}
                        </Text>
                      </View>
                    )}
                    {t.diagnosis && (
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillTxt} numberOfLines={1}>
                          {t.diagnosis}
                        </Text>
                      </View>
                    )}
                  </View>
                  {t.cost > 0 && (
                    <View style={styles.cardSubRow}>
                      <Ionicons name="cash-outline" size={12} color="#64748b" />
                      <Text style={[styles.cardSubTxt, { fontWeight: '700', color: '#0f172a' }]}>
                        {formatCurrency(Number(t.cost))}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardChevron}>
                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>

      {/* ── 3. Prescriptions ── */}
      <View>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="pulse" size={18} color="#B45309" />
            <Text style={styles.sectionTitle}>Prescriptions</Text>
          </View>
          {prescriptions.length > 0 && (
            <TouchableOpacity onPress={onSeeAllClinical}>
              <View style={[styles.countPill, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.countPillTxt, { color: '#B45309' }]}>
                  {prescriptions.length} {prescriptions.length === 1 ? 'Rx' : 'Rxs'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {prescriptions.length === 0 ? (
          <EmptyMini label="No prescriptions yet" />
        ) : (
          prescriptions.slice(0, 2).map((rx) => {
            const meds = rx.items ?? [];
            const shown = meds.slice(0, 3);
            const remaining = Math.max(0, meds.length - shown.length);
            return (
              <TouchableOpacity
                key={rx.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => onOpenPrescription(rx.id)}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {rx.diagnosis || 'Prescription'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.statusPillTxt, { color: '#B45309' }]}>
                      {meds.length} med{meds.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
                {meds.length > 0 && (
                  <View style={styles.medRow}>
                    {shown.map((m, i) => (
                      <View key={m.id ?? i} style={styles.medPill}>
                        <Text style={styles.medPillTxt} numberOfLines={1}>{m.drug_name}</Text>
                      </View>
                    ))}
                    {remaining > 0 && (
                      <View style={[styles.medPill, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.medPillTxt, { color: '#64748b' }]}>+{remaining}</Text>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.cardSubRow}>
                  <Ionicons name="calendar-outline" size={12} color="#64748b" />
                  <Text style={styles.cardSubTxt}>{formatDate(rx.created_at)}</Text>
                  {rx.dentist?.name && (
                    <>
                      <Text style={{ color: '#cbd5e1' }}> · </Text>
                      <Text style={styles.cardSubTxt}>{rx.dentist.name}</Text>
                    </>
                  )}
                </View>
                <View style={styles.cardChevron}>
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ── 4. Upcoming Appointments ── */}
      <View>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar" size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          </View>
          {upcoming.length > 0 && (
            <TouchableOpacity onPress={onSeeAllAppointments}>
              <View style={[styles.countPill, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.countPillTxt, { color: '#4361EE' }]}>
                  {upcoming.length} Upcoming
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {upcoming.length === 0 ? (
          <EmptyMini label="No upcoming appointments" />
        ) : (
          <View style={styles.apptStack}>
            {upcoming.map((a) => {
              const st = appointmentStatusStyle(a.status);
              return (
                <TouchableOpacity
                  key={a.id}
                  style={styles.apptCard}
                  activeOpacity={0.75}
                  onPress={() => onOpenAppointment(a.id)}
                >
                  <View style={styles.apptDate}>
                    <Text style={styles.apptDay}>{dayOfMonth(a.appointment_date)}</Text>
                    <Text style={styles.apptMonth}>{shortMonth(a.appointment_date)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.apptTitle} numberOfLines={1}>
                      {a.notes || 'Appointment'}
                    </Text>
                    <View style={styles.apptMeta}>
                      <Ionicons name="time-outline" size={11} color="#64748b" />
                      <Text style={styles.apptMetaTxt}>{timeOnly(a.start_time)}</Text>
                      {a.dentist?.name && (
                        <>
                          <Text style={{ color: '#cbd5e1' }}> · </Text>
                          <Text style={styles.apptMetaTxt}>{a.dentist.name}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillTxt, { color: st.text }]}>{st.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function treatmentStatusStyle(status: string) {
  switch (status) {
    case 'COMPLETED':   return { bg: '#DCFCE7', text: '#15803D', label: 'completed' };
    case 'IN_PROGRESS': return { bg: '#FEF3C7', text: '#B45309', label: 'in progress' };
    case 'PLANNED':     return { bg: '#DBEAFE', text: '#2563EB', label: 'planned' };
    default:            return { bg: '#F1F5F9', text: '#64748B', label: status?.toLowerCase() ?? 'planned' };
  }
}

function EmptyMini({ label }: { label: string }) {
  return (
    <View style={styles.emptyMini}>
      <Text style={styles.emptyMiniTxt}>{label}</Text>
    </View>
  );
}

function ComingSoonPanel({ tab, wave }: { tab: string; wave: number }) {
  return (
    <View style={styles.comingSoon}>
      <View style={styles.comingSoonIcon}>
        <Ionicons name="construct" size={26} color="#4361EE" />
      </View>
      <Text style={styles.comingSoonTitle}>{tab} — Wave {wave}</Text>
      <Text style={styles.comingSoonSub}>
        This tab is part of Wave {wave} and will be built next. The Overview tab is fully functional now.
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, gap: 10,
    backgroundColor: '#F8FAFC',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  topBreadcrumb: { fontSize: 11, color: '#64748b', marginTop: 1 },

  // ── Hero card ──
  heroWrap: { paddingHorizontal: 16, paddingTop: 8 },
  heroCard: {
    backgroundColor: '#E0E7FF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarTxt: { fontSize: 18, fontWeight: '800' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  heroSub: { fontSize: 12, color: '#475569' },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
  },
  pillTxt: { fontSize: 11, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  editTxt: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  heroDivider: { height: 1, backgroundColor: '#C7D2FE' },

  heroFooter: { flexDirection: 'row', gap: 12 },
  heroFooterLbl: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  heroFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroFooterVal: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  allergyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#FDE68A', marginTop: 4,
  },
  allergyBannerTxt: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 16 },

  // ── Quick Actions ──
  qaWrap: { paddingTop: 16, paddingBottom: 4 },
  qaLabel: {
    fontSize: 13, fontWeight: '700', color: '#0f172a',
    paddingHorizontal: 16, marginBottom: 10,
  },
  qaScroll: { paddingHorizontal: 16, gap: 10 },
  qaItem: { width: 78, alignItems: 'center', gap: 4 },
  qaIcon: {
    width: 56, height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  qaLbl: { fontSize: 11, color: '#0f172a', fontWeight: '600', marginTop: 4 },
  qaSub: { fontSize: 10, color: '#64748b' },

  // ── Tab strip ──
  tabStripWrap: {
    backgroundColor: '#F8FAFC',
    paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tabStrip: { paddingHorizontal: 16, gap: 6 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'transparent',
    backgroundColor: '#F1F5F9',
  },
  tabPillActive: {
    backgroundColor: '#EEF2FF', borderColor: '#C7D2FE',
  },
  tabPillTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabPillTxtActive: { color: '#4361EE', fontWeight: '700' },

  // ── Tab content ──
  tabContent: { paddingHorizontal: 16, paddingTop: 14 },

  // ── Section / card ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  countPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  countPillTxt: { fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 6,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingRight: 18 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardBody: { fontSize: 12, color: '#475569', lineHeight: 18 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillTxt: { fontSize: 10, fontWeight: '700' },
  cardMetaRow: { flexDirection: 'row', gap: 6 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#F1F5F9' },
  metaPillTxt: { fontSize: 11, color: '#475569', fontWeight: '600' },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardSubTxt: { fontSize: 12, color: '#475569' },
  cardChevron: { position: 'absolute', right: 12, top: 12 },

  // Treatment summary tiles
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  summaryTile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', gap: 2,
  },
  summaryNumActive: { fontSize: 18, fontWeight: '800', color: '#B45309' },
  summaryNumDone:   { fontSize: 18, fontWeight: '800', color: '#15803D' },
  summaryNumCost:   { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  summaryLbl: { fontSize: 10, fontWeight: '600', color: '#64748b', letterSpacing: 0.2 },

  // Medicine pills (prescription card)
  medRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  medPill: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
    maxWidth: '60%',
  },
  medPillTxt: { fontSize: 11, color: '#B45309', fontWeight: '600' },

  // Appointments stack (overview)
  apptStack: { gap: 8 },
  apptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  apptDate: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  apptDay: { fontSize: 16, fontWeight: '800', color: '#4361EE', lineHeight: 18 },
  apptMonth: { fontSize: 9, fontWeight: '700', color: '#4361EE', letterSpacing: 0.5 },
  apptTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  apptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  apptMetaTxt: { fontSize: 11, color: '#64748b' },

  // Empty mini state
  emptyMini: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyMiniTxt: { fontSize: 12, color: '#94a3b8' },

  // Coming soon
  comingSoon: {
    paddingVertical: 40, alignItems: 'center', gap: 10,
  },
  comingSoonIcon: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  comingSoonTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  comingSoonSub: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 40 },
});
