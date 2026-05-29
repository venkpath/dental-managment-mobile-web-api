import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { useDrawer } from '../../components/DrawerMenu';
import { useBottomInset } from '../../hooks/useBottomInset';
import { LegalLinkList } from '../../components/LegalText';
import { openSupportEmail } from '../../utils/openLegalUrl';
import type { BillingStackParamList, RootStackParamList, TabParamList } from '../../types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<BillingStackParamList, 'MoreMenu'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

type IonIcon = React.ComponentProps<typeof Ionicons>['name'];

type MenuItem = {
  label: string;
  sub?: string;
  icon: IonIcon;
  iconBg: string;
  iconColor: string;
  screen?: keyof BillingStackParamList;
  rootScreen?: keyof RootStackParamList;
  tab?: keyof TabParamList;
};

type Section = { title: string; items: MenuItem[] };

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

export default function MoreMenuScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const { user, clinicName } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const sections: Section[] = [
    {
      title: 'Billing & finance',
      items: [
        { label: 'Invoices', sub: 'View & collect payments', icon: 'receipt', iconBg: '#E0F2FE', iconColor: '#0369A1', screen: 'InvoiceList' },
        { label: 'Quick invoice', sub: 'Bill a patient now', icon: 'flash', iconBg: '#EEF2FF', iconColor: C.indigo, screen: 'QuickInvoice' },
        { label: 'Expenses', sub: 'Track clinic spending', icon: 'wallet', iconBg: '#FEF3C7', iconColor: '#B45309', screen: 'ExpenseList' },
        { label: 'Memberships', sub: 'Plans & enrollments', icon: 'shield-checkmark', iconBg: '#EDE9FE', iconColor: '#7C3AED', screen: 'MembershipList' },
      ],
    },
    {
      title: 'Clinical records',
      items: [
        { label: 'Treatments', sub: 'Procedures & charts', icon: 'medkit', iconBg: '#DCFCE7', iconColor: '#15803D', screen: 'TreatmentList' },
        { label: 'Prescriptions', sub: 'Medicines & print', icon: 'document-text', iconBg: '#FFEDD5', iconColor: '#EA580C', screen: 'PrescriptionList' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { label: 'Communications', sub: 'Templates & automation (web)', icon: 'chatbubbles', iconBg: '#E0F2FE', iconColor: '#0891b2', screen: 'Communications' },
        { label: 'Campaigns', sub: 'Bulk patient messages', icon: 'megaphone', iconBg: '#FCE7F3', iconColor: '#DB2777', screen: 'CampaignList' },
        { label: 'WhatsApp inbox', sub: 'Patient conversations', icon: 'logo-whatsapp', iconBg: '#DCFCE7', iconColor: '#25D366', tab: 'WhatsApp' },
      ],
    },
    {
      title: 'Insights & reports',
      items: [
        { label: 'Reports', sub: 'Charts & exports (web)', icon: 'bar-chart', iconBg: '#EEF2FF', iconColor: C.indigo, screen: 'Reports' },
        { label: 'AI insights', sub: 'Risk & recall scores', icon: 'sparkles', iconBg: '#EDE9FE', iconColor: '#7C3AED', screen: 'AIInsights' },
      ],
    },
    {
      title: 'Clinic administration',
      items: [
        { label: 'Staff', sub: 'Doctors & reception', icon: 'people-circle', iconBg: '#F1F5F9', iconColor: '#475569', screen: 'StaffList' },
        { label: 'Branches', sub: 'Locations & hours', icon: 'business', iconBg: '#ECFEFF', iconColor: '#0891b2', screen: 'BranchList' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Notifications', sub: unreadCount > 0 ? `${unreadCount} unread` : 'Alerts & reminders', icon: 'notifications', iconBg: '#FEE2E2', iconColor: '#DC2626', rootScreen: 'Notifications' },
        { label: 'My profile', sub: 'Password & sign out', icon: 'person-circle', iconBg: '#EEF2FF', iconColor: C.indigo, rootScreen: 'Profile' },
        { label: 'Subscription', sub: 'Plan & billing (web)', icon: 'card', iconBg: '#FEF3C7', iconColor: '#B45309', screen: 'BillingGuide' },
        { label: 'Settings', sub: 'Clinic config (web)', icon: 'settings', iconBg: '#F1F5F9', iconColor: '#64748b', screen: 'SettingsGuide' },
      ],
    },
  ];

  const onItemPress = (item: MenuItem) => {
    if (item.tab) {
      navigation.navigate(item.tab);
      return;
    }
    if (item.rootScreen) {
      navigation.navigate(item.rootScreen);
      return;
    }
    if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const displayName = user?.name?.startsWith('Dr.') ? user.name : user?.name ? `Dr. ${user.name}` : 'Staff';

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>More</Text>
          <Text style={s.subtitle} numberOfLines={1}>{clinicName ?? 'Smart Dental Desk'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.welcomeCard}>
          <View style={s.welcomeIcon}>
            <Ionicons name="grid" size={22} color={C.indigo} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.welcomeName}>{displayName}</Text>
            <Text style={s.welcomeHint}>Billing, admin, reports & settings</Text>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.card}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.row, idx < section.items.length - 1 && s.rowBorder]}
                  onPress={() => onItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[s.rowIcon, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowLabel}>{item.label}</Text>
                    {item.sub ? <Text style={s.rowSub}>{item.sub}</Text> : null}
                  </View>
                  {item.label === 'Notifications' && unreadCount > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeTxt}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Legal & support</Text>
          <LegalLinkList />
          <TouchableOpacity
            style={s.supportRow}
            onPress={() => openSupportEmail()}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={20} color={C.indigo} />
            <Text style={s.supportTxt}>support@smartdentaldesk.com</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>
          Use Home, Patients, Schedule & Inbox in the footer for daily work. Open items here for billing and clinic setup.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  scroll: { padding: 16, gap: 4 },
  welcomeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  welcomeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  welcomeName: { fontSize: 15, fontWeight: '700', color: C.text },
  welcomeHint: { fontSize: 12, color: C.textSub, marginTop: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  rowSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  badge: { backgroundColor: '#DC2626', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 16, paddingHorizontal: 12 },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  supportTxt: { fontSize: 14, fontWeight: '600', color: C.indigo },
});
