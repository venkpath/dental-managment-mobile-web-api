import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Switch,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatCurrency } from '../../../utils/format';
import type { PatientStackParamList } from '../../../types';
import {
  patientPreferencesService,
  type PatientPreferences,
} from '../../../services/patientPreferences.service';
import { consentsService } from '../../../services/consents.service';
import type { PatientMembershipSummary, MembershipEnrollment } from '../../../services/memberships.service';
import type { PatientInsurance } from '../../../services/insurance.service';
import type { PatientConsent } from '../../../services/consents.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function isExpired(end?: string | null) {
  if (!end) return false;
  const d = new Date(end);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

// ─── Insurance helpers ──────────────────────────────────────────────────────
function insuranceTypeLabel(t?: string) {
  switch (t) {
    case 'government_ehs': return 'Government EHS';
    case 'corporate_ehs':  return 'Corporate EHS';
    case 'national_plan':  return 'National Plan';
    case 'group_health':   return 'Group Health';
    case 'private':        return 'Private Insurance';
    case 'tpa':            return 'TPA';
    default:               return t ?? 'Insurance';
  }
}

function consentStatusStyle(s?: string) {
  switch ((s ?? '').toLowerCase()) {
    case 'signed':    return { bg: '#DCFCE7', text: '#15803D', label: 'Signed' };
    case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' };
    case 'archived':  return { bg: '#F1F5F9', text: '#64748B', label: 'Archived' };
    default:          return { bg: '#FEF3C7', text: '#B45309', label: 'Pending' };
  }
}

// ─── Section header (expand/collapse) ────────────────────────────────────────
function SectionRow({
  icon, iconColor, title, subtitle, badge, expanded, onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; bg: string; text: string };
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={s.sectionRow} onPress={onToggle} activeOpacity={0.75}>
      <View style={[s.sectionIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle && <Text style={s.sectionSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={[s.sectionBadge, { backgroundColor: badge.bg }]}>
          <Text style={[s.sectionBadgeTxt, { color: badge.text }]}>{badge.label}</Text>
        </View>
      )}
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

// ─── Main MoreTab ────────────────────────────────────────────────────────────
export interface MoreTabProps {
  loading: boolean;
  patientId: string;
  patientName: string;
  memberships: PatientMembershipSummary;
  insurance: PatientInsurance[];
  consents: PatientConsent[];
}

export function MoreTab({
  loading, patientId, patientName, memberships, insurance, consents,
}: MoreTabProps) {
  const [openKey, setOpenKey] = useState<string | null>('memberships');
  const toggle = (k: string) => setOpenKey((cur) => (cur === k ? null : k));

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#4361EE" />
      </View>
    );
  }

  const activeMemberships = memberships.active ?? [];
  const pastMemberships = memberships.past ?? [];
  const totalMemberships = activeMemberships.length + pastMemberships.length;
  const pendingConsents = consents.filter((c) => c.status === 'pending').length;

  return (
    <View style={{ gap: 10 }}>
      {/* ── Memberships ── */}
      <View style={s.sectionWrap}>
        <SectionRow
          icon="shield-checkmark"
          iconColor="#7C3AED"
          title="Memberships"
          subtitle={
            activeMemberships.length > 0
              ? `${activeMemberships.length} active`
              : totalMemberships > 0 ? `${totalMemberships} past` : 'No memberships yet'
          }
          badge={activeMemberships.length > 0
            ? { label: `${activeMemberships.length}`, bg: '#EDE9FE', text: '#7C3AED' }
            : undefined}
          expanded={openKey === 'memberships'}
          onToggle={() => toggle('memberships')}
        />
        {openKey === 'memberships' && (
          <View style={s.sectionBody}>
            <MembershipsSection
              active={activeMemberships}
              past={pastMemberships}
              patientId={patientId}
              patientName={patientName}
            />
          </View>
        )}
      </View>

      {/* ── Consents ── */}
      <View style={s.sectionWrap}>
        <SectionRow
          icon="document-text"
          iconColor="#15803D"
          title="Consents"
          subtitle={
            consents.length > 0
              ? `${pendingConsents} pending · ${consents.length - pendingConsents} signed`
              : 'No consent forms yet'
          }
          badge={pendingConsents > 0
            ? { label: `${pendingConsents} Pending`, bg: '#FEF3C7', text: '#B45309' }
            : consents.length > 0
              ? { label: `${consents.length}`, bg: '#DCFCE7', text: '#15803D' }
              : undefined}
          expanded={openKey === 'consents'}
          onToggle={() => toggle('consents')}
        />
        {openKey === 'consents' && (
          <View style={s.sectionBody}>
            <ConsentsSection items={consents} patientId={patientId} patientName={patientName} />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── 1. Memberships ──────────────────────────────────────────────────────────
function MembershipsSection({
  active, past, patientId, patientName,
}: {
  active: MembershipEnrollment[];
  past: MembershipEnrollment[];
  patientId: string;
  patientName: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const hasAny = active.length + past.length > 0;
  const enrollBtn = (
    <TouchableOpacity
      style={s.enrollBtn}
      onPress={() => navigation.navigate('EnrollMembership', { patientId, patientName })}
    >
      <Ionicons name="add-circle" size={14} color="#7C3AED" />
      <Text style={s.enrollBtnTxt}>Enroll in Membership</Text>
    </TouchableOpacity>
  );

  if (!hasAny) {
    return (
      <View style={{ gap: 10 }}>
        <Empty
          icon="shield-checkmark-outline"
          title="No membership history"
          sub="Membership enrollments will appear here."
        />
        {enrollBtn}
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {active.map((e) => <EnrollmentCard key={e.id} enrollment={e} />)}
      {past.length > 0 && (
        <>
          <View style={s.divider}>
            <Text style={s.dividerTxt}>Past</Text>
          </View>
          {past.map((e) => <EnrollmentCard key={e.id} enrollment={e} muted />)}
        </>
      )}
      {enrollBtn}
    </View>
  );
}

function EnrollmentCard({ enrollment, muted }: { enrollment: MembershipEnrollment; muted?: boolean }) {
  const planName = enrollment.membership_plan?.name ?? 'Membership';
  const expired = isExpired(enrollment.end_date);
  return (
    <View style={[s.card, muted && { opacity: 0.7 }]}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>{planName}</Text>
          {enrollment.enrollment_number && (
            <Text style={s.cardSub}>#{enrollment.enrollment_number}</Text>
          )}
        </View>
        <View style={[s.statusPill, { backgroundColor: expired ? '#FEE2E2' : '#DCFCE7' }]}>
          <Text style={[s.statusPillTxt, { color: expired ? '#DC2626' : '#15803D' }]}>
            {expired ? 'Expired' : (enrollment.status ?? 'active').toString().replace(/^./, (c) => c.toUpperCase())}
          </Text>
        </View>
      </View>

      <View style={s.metaGrid}>
        <MetaCell label="Start" value={formatDate(enrollment.start_date)} />
        <MetaCell label="End"   value={formatDate(enrollment.end_date)} />
        {enrollment.amount_paid != null && (
          <MetaCell label="Paid" value={formatCurrency(Number(enrollment.amount_paid))} />
        )}
        {enrollment.members && (
          <MetaCell label="Members" value={`${enrollment.members.length}`} />
        )}
      </View>

      {!!enrollment.benefits?.length && (
        <View style={s.benefitsWrap}>
          <Text style={s.benefitsLbl}>BENEFITS ({enrollment.benefits.length})</Text>
          {enrollment.benefits.slice(0, 3).map((b) => (
            <View key={b.id} style={s.benefitRow}>
              <View style={s.benefitDot} />
              <Text style={s.benefitTxt} numberOfLines={1}>{b.title}</Text>
              {b.remaining_quantity != null && b.total_quantity != null && (
                <Text style={s.benefitMeta}>{b.remaining_quantity}/{b.total_quantity} left</Text>
              )}
              {b.discount_percentage != null && (
                <Text style={s.benefitMeta}>{b.discount_percentage}% off</Text>
              )}
            </View>
          ))}
          {enrollment.benefits.length > 3 && (
            <Text style={s.moreTxt}>+{enrollment.benefits.length - 3} more</Text>
          )}
        </View>
      )}
    </View>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLbl}>{label}</Text>
      <Text style={s.metaVal} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── 2. Insurance ────────────────────────────────────────────────────────────
function InsuranceSection({ items }: { items: PatientInsurance[] }) {
  if (items.length === 0) {
    return (
      <Empty
        icon="shield-outline"
        title="No insurance on file"
        sub="Add the patient's EHS card or private insurance so claims can be billed directly."
      />
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {items.map((i) => <InsuranceCard key={i.id} item={i} />)}
      <ComingSoonBtn label="Add Insurance / EHS" />
    </View>
  );
}

function InsuranceCard({ item }: { item: PatientInsurance }) {
  const inactive = item.is_active === false;
  const expired = isExpired(item.coverage_end);
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <View style={s.providerRow}>
            {item.provider?.short_code && (
              <View style={s.providerCodeBox}>
                <Text style={s.providerCodeTxt}>{item.provider.short_code.slice(0, 4)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.provider?.name ?? 'Insurance Provider'}
              </Text>
              {item.plan?.plan_name && (
                <Text style={s.cardSub} numberOfLines={1}>{item.plan.plan_name}</Text>
              )}
            </View>
          </View>
        </View>
        {item.priority === 'primary' && (
          <View style={[s.statusPill, { backgroundColor: '#EDE9FE' }]}>
            <Text style={[s.statusPillTxt, { color: '#7C3AED' }]}>PRIMARY</Text>
          </View>
        )}
        {item.priority === 'secondary' && (
          <View style={[s.statusPill, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[s.statusPillTxt, { color: '#64748B' }]}>SECONDARY</Text>
          </View>
        )}
      </View>

      {/* Type badge + status row */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <View style={[s.typeBadge, { backgroundColor: '#E0F2FE' }]}>
          <Text style={[s.typeBadgeTxt, { color: '#0369A1' }]}>{insuranceTypeLabel(item.type)}</Text>
        </View>
        {inactive && (
          <View style={[s.typeBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[s.typeBadgeTxt, { color: '#DC2626' }]}>Inactive</Text>
          </View>
        )}
        {expired && (
          <View style={[s.typeBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[s.typeBadgeTxt, { color: '#B45309' }]}>Expired</Text>
          </View>
        )}
      </View>

      <View style={s.metaGrid}>
        {item.member_id && <MetaCell label="Member ID" value={item.member_id} />}
        {item.beneficiary_no && <MetaCell label="Beneficiary" value={item.beneficiary_no} />}
        {item.employee_id && <MetaCell label="Emp. ID" value={item.employee_id} />}
        {item.employer && <MetaCell label="Employer" value={item.employer} />}
        {item.group_number && <MetaCell label="Group #" value={item.group_number} />}
        {item.coverage_end && <MetaCell label="Valid until" value={formatDate(item.coverage_end)} />}
        {item.dependent_relationship && item.dependent_relationship !== 'self' && (
          <MetaCell label="Relation" value={item.dependent_relationship} />
        )}
        {item.subscriber_name && <MetaCell label="Subscriber" value={item.subscriber_name} />}
      </View>

      {/* Docs row */}
      <View style={s.docsRow}>
        <DocSlot label="Card Front" present={!!item.has_card_front} />
        <DocSlot label="Card Back"  present={!!item.has_card_back} />
        <DocSlot label="Referral"   present={!!item.has_referral} />
      </View>
    </View>
  );
}

function DocSlot({ label, present }: { label: string; present: boolean }) {
  return (
    <View style={[s.docSlot, present && s.docSlotPresent]}>
      <Ionicons
        name={present ? 'document-attach' : 'cloud-upload-outline'}
        size={14}
        color={present ? '#15803D' : '#94a3b8'}
      />
      <Text style={[s.docSlotTxt, present && { color: '#15803D' }]}>{label}</Text>
    </View>
  );
}

// ─── 3. Consents ─────────────────────────────────────────────────────────────
function ConsentsSection({
  items, patientId, patientName,
}: {
  items: PatientConsent[];
  patientId: string;
  patientName: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const [busyId, setBusyId] = useState<string | null>(null);

  const openConsent = async (id: string) => {
    setBusyId(id);
    try {
      const url = await consentsService.getDownloadUrl(id);
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Could not open', 'No download URL available.');
      }
    } catch {
      Alert.alert('Could not open', 'Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const sendLink = async (id: string) => {
    setBusyId(id);
    try {
      const result = await consentsService.sendSignLink(id);
      Alert.alert('Link sent', result.channel
        ? `Sent via ${result.channel}.`
        : 'A sign link has been sent to the patient.');
    } catch {
      Alert.alert('Send failed', 'Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (id: string) => {
    Alert.alert(
      'Archive consent?',
      'It will no longer be active but stays in records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setBusyId(id);
            try {
              await consentsService.archive(id);
              Alert.alert('Archived', 'Consent moved to archive.');
            } catch {
              Alert.alert('Could not archive', 'Try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const newConsentBtn = (
    <TouchableOpacity
      style={s.newConsentBtn}
      onPress={() => navigation.navigate('NewConsent', { patientId })}
    >
      <Ionicons name="add-circle" size={14} color="#15803D" />
      <Text style={s.newConsentBtnTxt}>New Consent</Text>
    </TouchableOpacity>
  );

  if (items.length === 0) {
    return (
      <View style={{ gap: 10 }}>
        <Empty icon="document-text-outline" title="No consent forms yet" sub="Generated consents will appear here." />
        {newConsentBtn}
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {items.map((c) => {
        const st = consentStatusStyle(c.status);
        const title = c.template?.title ?? c.template_title ?? 'Consent Form';
        const isPending = c.status === 'pending';
        const isArchived = c.status === 'archived';
        const isBusy = busyId === c.id;
        return (
          <View key={c.id} style={s.card}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle} numberOfLines={2}>{title}</Text>
                <View style={s.cardSubRow}>
                  <Ionicons name="calendar-outline" size={11} color="#64748b" />
                  <Text style={s.cardSub}>Generated {formatDate(c.generated_at ?? c.created_at)}</Text>
                  {c.language && (
                    <>
                      <Text style={{ color: '#cbd5e1' }}> · </Text>
                      <Text style={s.cardSub}>{c.language.toUpperCase()}</Text>
                    </>
                  )}
                </View>
                {c.signed_at && (
                  <View style={s.cardSubRow}>
                    <Ionicons name="checkmark-circle" size={11} color="#15803D" />
                    <Text style={s.cardSub}>
                      Signed {formatDate(c.signed_at)}
                      {c.signed_by_name ? ` · ${c.signed_by_name}` : ''}
                    </Text>
                  </View>
                )}
                {isPending && c.link_sent_at && (
                  <View style={s.cardSubRow}>
                    <Ionicons name="paper-plane" size={11} color="#0369A1" />
                    <Text style={s.cardSub}>Link sent {formatDate(c.link_sent_at)}</Text>
                  </View>
                )}
              </View>
              <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                <Text style={[s.statusPillTxt, { color: st.text }]}>{st.label}</Text>
              </View>
            </View>

            <View style={s.consentActions}>
              <TouchableOpacity
                style={s.btnGhost}
                onPress={() => openConsent(c.id)}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#4361EE" />
                ) : (
                  <>
                    <Ionicons name="eye" size={13} color="#4361EE" />
                    <Text style={s.btnGhostTxt}>View</Text>
                  </>
                )}
              </TouchableOpacity>
              {isPending && (
                <>
                  <TouchableOpacity style={s.btnGhost} onPress={() => sendLink(c.id)} disabled={isBusy}>
                    <Ionicons name="paper-plane" size={13} color="#0369A1" />
                    <Text style={[s.btnGhostTxt, { color: '#0369A1' }]}>Send link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.btnPrimary}
                    onPress={() => navigation.navigate('SignConsent', {
                      consentId: c.id,
                      consentTitle: title,
                      defaultName: patientName,
                    })}
                    disabled={isBusy}
                  >
                    <Ionicons name="create" size={13} color="#fff" />
                    <Text style={s.btnPrimaryTxt}>Sign</Text>
                  </TouchableOpacity>
                </>
              )}
              {!isArchived && !isPending && (
                <TouchableOpacity style={s.btnGhost} onPress={() => archive(c.id)} disabled={isBusy}>
                  <Ionicons name="archive" size={13} color="#64748b" />
                  <Text style={[s.btnGhostTxt, { color: '#64748b' }]}>Archive</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
      {newConsentBtn}
    </View>
  );
}

// ─── 4. Messaging Preferences ────────────────────────────────────────────────
const PREFERRED_CHANNEL_OPTIONS = ['whatsapp', 'sms', 'email'] as const;

function MessagingSection({ patientId }: { patientId: string }) {
  const [prefs, setPrefs] = useState<PatientPreferences | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);

  useEffect(() => {
    patientPreferencesService.get(patientId).then((p) => {
      setPrefs(p);
      setDirty(false);
    }).catch(() => setPrefs(null));
  }, [patientId]);

  const update = useCallback(<K extends keyof PatientPreferences>(key: K, value: PatientPreferences[K]) => {
    setPrefs((prev) => prev ? { ...prev, [key]: value } : prev);
    setDirty(true);
  }, []);

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await patientPreferencesService.update(patientId, prefs);
      setDirty(false);
      Alert.alert('Saved', 'Preferences updated.');
    } catch (err) {
      Alert.alert('Save failed', (err as { message?: string })?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#4361EE" />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Channels */}
      <View style={s.prefCard}>
        <Text style={s.prefHeader}>Channel Permissions</Text>
        <ToggleRow
          icon="mail" iconColor="#4361EE"
          title="Email" sub="Allow email messages"
          value={!!prefs.allow_email}
          onChange={(v) => update('allow_email', v)}
        />
        <ToggleRow
          icon="call" iconColor="#0369A1"
          title="SMS" sub="Allow SMS text messages"
          value={!!prefs.allow_sms}
          onChange={(v) => update('allow_sms', v)}
        />
        <ToggleRow
          icon="logo-whatsapp" iconColor="#15803D"
          title="WhatsApp" sub="Allow WhatsApp messages"
          value={!!prefs.allow_whatsapp}
          onChange={(v) => update('allow_whatsapp', v)}
          isLast
        />
      </View>

      {/* Message types */}
      <View style={s.prefCard}>
        <Text style={s.prefHeader}>Message Types</Text>
        <ToggleRow
          icon="notifications" iconColor="#B45309"
          title="Reminders" sub="Appointment & payment reminders"
          value={!!prefs.allow_reminders}
          onChange={(v) => update('allow_reminders', v)}
        />
        <ToggleRow
          icon="megaphone" iconColor="#7C3AED"
          title="Marketing & Promotions" sub="Campaigns, offers, greetings"
          value={!!prefs.allow_marketing}
          onChange={(v) => update('allow_marketing', v)}
          isLast
        />
      </View>

      {/* Delivery preferences */}
      <View style={s.prefCard}>
        <Text style={s.prefHeader}>Delivery Preferences</Text>

        <Text style={s.fieldLabel}>Preferred Channel</Text>
        <TouchableOpacity
          style={s.fieldSelect}
          onPress={() => setChannelPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={s.fieldSelectTxt}>
            {(prefs.preferred_channel ?? 'whatsapp').replace(/^./, (c) => c.toUpperCase())}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#94a3b8" />
        </TouchableOpacity>

        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Quiet Hours</Text>
        <View style={s.timeRow}>
          <TimeInput
            value={prefs.quiet_hours_start ?? '21:00'}
            onChange={(v) => update('quiet_hours_start', v)}
          />
          <Text style={s.timeSep}>to</Text>
          <TimeInput
            value={prefs.quiet_hours_end ?? '09:00'}
            onChange={(v) => update('quiet_hours_end', v)}
          />
        </View>
        <Text style={s.helperTxt}>No messages will be sent during these hours.</Text>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[s.saveBtn, !dirty && { opacity: 0.5 }]}
        onPress={save}
        disabled={!dirty || saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark" size={15} color="#fff" />
            <Text style={s.saveBtnTxt}>{dirty ? 'Save Preferences' : 'No changes'}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Channel picker */}
      <Modal visible={channelPickerOpen} transparent animationType="fade" onRequestClose={() => setChannelPickerOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setChannelPickerOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Preferred Channel</Text>
              <TouchableOpacity onPress={() => setChannelPickerOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {PREFERRED_CHANNEL_OPTIONS.map((opt) => {
                const active = prefs.preferred_channel === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.modalItem, active && s.modalItemActive]}
                    onPress={() => { update('preferred_channel', opt); setChannelPickerOpen(false); }}
                  >
                    <Text style={[s.modalItemTxt, active && s.modalItemTxtActive]}>
                      {opt.replace(/^./, (c) => c.toUpperCase())}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color="#4361EE" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ToggleRow({
  icon, iconColor, title, sub, value, onChange, isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string; title: string; sub?: string;
  value: boolean; onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[s.toggleRow, !isLast && s.toggleRowBorder]}>
      <View style={[s.toggleIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleTitle}>{title}</Text>
        {sub && <Text style={s.toggleSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E2E8F0', true: '#4361EE' }}
        thumbColor="#fff"
      />
    </View>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [tmp, setTmp] = useState(value);
  useEffect(() => { setTmp(value); }, [value]);
  const handle = (v: string) => {
    // Allow HH:MM format only
    const clean = v.replace(/[^0-9:]/g, '').slice(0, 5);
    setTmp(clean);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(clean)) onChange(clean);
  };
  return (
    <View style={s.timeBox}>
      <Ionicons name="time-outline" size={13} color="#94a3b8" />
      <Text style={{ position: 'absolute', left: -9999 }}>{value}</Text>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => {
          Alert.prompt
            ? Alert.prompt('Set time', 'Enter HH:MM (24h)', (text) => text && handle(text), 'plain-text', value)
            : Alert.alert('Time format', 'Use the form HH:MM (24-hour).');
        }}
      >
        <Text style={s.timeTxt}>{tmp}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────
function Empty({ icon, title, sub }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={24} color="#94a3b8" />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

function ComingSoonBtn({ label }: { label: string }) {
  return (
    <TouchableOpacity
      style={s.cmsBtn}
      onPress={() => Alert.alert('Coming soon', `${label} is on the roadmap for the next push.`)}
      activeOpacity={0.7}
    >
      <Ionicons name="add" size={15} color="#4361EE" />
      <Text style={s.cmsBtnTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Section wrapper
  sectionWrap: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 1 },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sectionBadgeTxt: { fontSize: 10, fontWeight: '700' },

  sectionBody: {
    paddingHorizontal: 12, paddingTop: 4, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },

  // Card
  card: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },

  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusPillTxt: { fontSize: 10, fontWeight: '700' },

  // Meta grid (2-col)
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaCell: { minWidth: '46%', gap: 1 },
  metaLbl: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaVal: { fontSize: 13, fontWeight: '600', color: '#0f172a' },

  // Benefits
  benefitsWrap: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 5,
  },
  benefitsLbl: { fontSize: 10, fontWeight: '800', color: '#7C3AED', letterSpacing: 0.5, marginBottom: 2 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#7C3AED' },
  benefitTxt: { flex: 1, fontSize: 12, color: '#0f172a' },
  benefitMeta: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  moreTxt: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginLeft: 10 },

  // Provider header row
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  providerCodeBox: {
    width: 38, height: 38, borderRadius: 8, backgroundColor: '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  providerCodeTxt: { fontSize: 11, fontWeight: '800', color: '#0369A1', letterSpacing: 0.3 },

  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeTxt: { fontSize: 10, fontWeight: '700' },

  // Doc slots
  docsRow: { flexDirection: 'row', gap: 6 },
  docSlot: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
  },
  docSlotPresent: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  docSlotTxt: { fontSize: 10, fontWeight: '600', color: '#64748b' },

  // Consents actions
  consentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  btnGhostTxt: { fontSize: 11, fontWeight: '700', color: '#4361EE' },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#4361EE', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  btnPrimaryTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Action buttons (Enroll / New Consent)
  enrollBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EDE9FE', borderRadius: 10, paddingVertical: 11,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  enrollBtnTxt: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  newConsentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#DCFCE7', borderRadius: 10, paddingVertical: 11,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  newConsentBtnTxt: { fontSize: 12, fontWeight: '700', color: '#15803D' },

  // Divider for past memberships
  divider: { paddingVertical: 4 },
  dividerTxt: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Messaging — preference cards
  prefCard: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 8,
  },
  prefHeader: {
    fontSize: 11, fontWeight: '800', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  toggleSub: { fontSize: 11, color: '#64748b', marginTop: 1 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  fieldSelect: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  fieldSelectTxt: { fontSize: 13, fontWeight: '600', color: '#0f172a' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  timeTxt: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  timeSep: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  helperTxt: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4361EE', paddingVertical: 13, borderRadius: 12,
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Empty
  empty: {
    paddingVertical: 20, alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 11, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },

  // Coming-soon button
  cmsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#C7D2FE',
  },
  cmsBtnTxt: { fontSize: 12, fontWeight: '700', color: '#4361EE' },

  // Picker modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8, paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  modalItemActive: { backgroundColor: '#EEF2FF' },
  modalItemTxt: { fontSize: 14, color: '#0f172a' },
  modalItemTxtActive: { color: '#4361EE', fontWeight: '700' },
});
