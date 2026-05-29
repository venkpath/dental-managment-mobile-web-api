import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../../services/user.service';
import { formatCurrency } from '../../utils/format';
import { staffRoleMeta, staffStatusMeta } from '../../utils/staffRole';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useAuthStore } from '../../store/auth.store';
import { canManageStaff } from '../../utils/permissions';
import type { ClinicUser, BillingStackParamList } from '../../types';

type Route = RouteProp<BillingStackParamList, 'StaffDetail'>;
type Nav = NativeStackNavigationProp<BillingStackParamList>;

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  violet: '#7c3aed', violetLight: '#f5f3ff',
  green: '#059669', greenLight: '#d1fae5',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0', divider: '#EEF2F6',
};

function DetailRow({ label, value, icon, onPress }: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  if (!value || value === '—') return null;
  const inner = (
    <View style={s.row}>
      {icon ? (
        <View style={s.rowIcon}>
          <Ionicons name={icon} size={16} color={C.indigo} />
        </View>
      ) : null}
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={[s.rowValue, onPress && s.rowLink]}>{value}</Text>
      </View>
      {onPress ? <Ionicons name="open-outline" size={16} color={C.textMuted} /> : null}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>;
  }
  return inner;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function StaffDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { userId } = route.params;
  const { user: sessionUser } = useAuthStore();
  const showEdit = canManageStaff(sessionUser?.role);

  const [user, setUser] = useState<ClinicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    userService.get(userId)
      .then((u) => { setUser(u); setLoadError(false); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const rm = user ? staffRoleMeta(user.role, user.is_doctor) : null;
  const sm = user ? staffStatusMeta(user.status) : null;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Staff member</Text>
        {showEdit ? (
          <TouchableOpacity onPress={() => navigation.navigate('EditStaff', { userId })} style={s.hBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color={C.indigo} />
          </TouchableOpacity>
        ) : (
          <View style={s.hBtnPlaceholder} />
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.indigo} /></View>
      ) : loadError || !user || !rm || !sm ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={C.textMuted} />
          <Text style={s.errTitle}>Could not load staff member</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroCard}>
            {user.profile_photo_url ? (
              <Image source={{ uri: user.profile_photo_url }} style={s.heroPhoto} />
            ) : (
              <View style={[s.heroAvatar, { backgroundColor: rm.bg }]}>
                <Text style={[s.heroInitials, { color: rm.fg }]}>{initials(user.name)}</Text>
              </View>
            )}
            <Text style={s.heroName}>{user.name}</Text>
            <View style={s.heroPills}>
              <View style={[s.pill, { backgroundColor: rm.bg }]}>
                <Text style={[s.pillTxt, { color: rm.fg }]}>{rm.label}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: sm.bg }]}>
                <Text style={[s.pillTxt, { color: sm.fg }]}>{sm.label}</Text>
              </View>
              {user.is_doctor ? (
                <View style={[s.pill, { backgroundColor: C.violetLight }]}>
                  <Text style={[s.pillTxt, { color: C.violet }]}>Doctor</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Contact</Text>
            <DetailRow label="Email" value={user.email} icon="mail-outline" />
            <DetailRow
              label="Phone"
              value={user.phone ?? '—'}
              icon="call-outline"
              onPress={user.phone ? () => Linking.openURL(`tel:${user.phone}`) : undefined}
            />
            <DetailRow label="Branch" value={user.branch?.name ?? 'All branches'} icon="business-outline" />
          </View>

          {(user.license_number || user.consultation_fee != null) && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Clinical</Text>
              <DetailRow label="License" value={user.license_number ?? '—'} icon="document-text-outline" />
              {user.consultation_fee != null && Number(user.consultation_fee) > 0 ? (
                <DetailRow
                  label="Consultation fee"
                  value={formatCurrency(Number(user.consultation_fee))}
                  icon="cash-outline"
                />
              ) : null}
              {user.years_experience != null ? (
                <DetailRow
                  label="Experience"
                  value={`${user.years_experience} year${user.years_experience === 1 ? '' : 's'}`}
                  icon="school-outline"
                />
              ) : null}
              {user.languages_spoken ? (
                <DetailRow label="Languages" value={user.languages_spoken} icon="language-outline" />
              ) : null}
            </View>
          )}

          {user.bio ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Bio</Text>
              <Text style={s.bioText}>{user.bio}</Text>
            </View>
          ) : null}

          <View style={s.card}>
            <Text style={s.cardTitle}>Account</Text>
            <DetailRow
              label="Email verified"
              value={user.email_verified ? 'Yes' : 'No'}
              icon="shield-checkmark-outline"
            />
            <DetailRow
              label="Listed in directory"
              value={user.listed_in_directory ? 'Yes' : 'No'}
              icon="globe-outline"
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  hBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  hBtnPlaceholder: { width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errTitle: { fontSize: 15, fontWeight: '600', color: C.textSub },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: C.indigo },
  retryTxt: { color: '#fff', fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  heroCard: { backgroundColor: C.surface, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  heroPhoto: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  heroAvatar: { width: 72, height: 72, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroInitials: { fontSize: 24, fontWeight: '800' },
  heroName: { fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center' },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  pillTxt: { fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: C.text },
  rowLink: { color: C.indigo },
  bioText: { fontSize: 14, color: C.textSub, lineHeight: 21 },
});
