import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useDrawer } from './DrawerContext';
import { useAuthStore } from '../../store/auth.store';
import type { RootStackParamList, TabParamList } from '../../types';

const { width: SW } = Dimensions.get('window');
const DRAWER_W = Math.min(300, SW * 0.84);
const ANIM_MS = 240;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  label: string;
  icon: IoniconsName;
  badge?: string | number;
  badgeColor?: string;
  highlight?: boolean;
  hasChevron?: boolean;
  expandable?: boolean;
  children?: Array<{ label: string; icon: IoniconsName }>;
  onPress?: () => void;
  /** Tab name to navigate inside AppTabs (if applicable) */
  tab?: keyof TabParamList;
}

// Brand mark — small tooth logo
function BrandMark() {
  return (
    <View style={styles.brandMark}>
      <Ionicons name="medical" size={20} color="#4361EE" />
    </View>
  );
}

function MenuRow({
  item,
  active,
  expanded,
  onPress,
  onToggleExpand,
}: {
  item: MenuItem;
  active: boolean;
  expanded: boolean;
  onPress: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={item.expandable ? onToggleExpand : onPress}
        style={[styles.row, active && styles.rowActive]}
      >
        {/* Icon — boxed when active */}
        {active ? (
          <View style={styles.iconBoxActive}>
            <Ionicons name={item.icon} size={18} color="#fff" />
          </View>
        ) : (
          <View style={styles.iconBox}>
            <Ionicons name={item.icon} size={18} color="#475569" />
          </View>
        )}

        <Text
          style={[
            styles.rowLabel,
            active && styles.rowLabelActive,
          ]}
        >
          {item.label}
        </Text>

        {/* Trailing badge / chevron */}
        {item.badge != null && (
          <View
            style={[
              styles.badge,
              item.badgeColor === 'pill'
                ? styles.badgePill
                : { backgroundColor: '#FB7185' },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                item.badgeColor === 'pill' && styles.badgeTextPill,
              ]}
            >
              {item.badge}
            </Text>
          </View>
        )}
        {item.hasChevron && !item.expandable && (
          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        )}
        {item.expandable && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#94a3b8"
          />
        )}
      </TouchableOpacity>

      {/* Expanded children */}
      {item.expandable && expanded && item.children && (
        <View style={styles.subList}>
          {item.children.map((c) => (
            <TouchableOpacity key={c.label} style={styles.subRow} activeOpacity={0.6}>
              <Ionicons name={c.icon} size={14} color="#64748b" />
              <Text style={styles.subLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

export function DrawerMenu() {
  const { isOpen, close } = useDrawer();
  const { user, clinicName, logout } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const slide = useRef(new Animated.Value(-DRAWER_W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [insuranceExpanded, setInsuranceExpanded] = useState(true);
  const [activeKey, setActiveKey] = useState<string>('Dashboard');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: ANIM_MS,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: ANIM_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: -DRAWER_W,
          duration: ANIM_MS,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: ANIM_MS,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [isOpen, mounted, slide, fade]);

  if (!mounted) return null;

  const navigateTab = (tab: keyof TabParamList) => {
    setActiveKey(tab as string);
    close();
    // Reach into the App tab navigator
    requestAnimationFrame(() => {
      // @ts-expect-error nested navigator typing
      navigation.navigate('App', { screen: tab });
    });
  };

  // Pull doctor name from user
  const doctorName = user?.name?.startsWith('Dr.')
    ? user.name
    : user?.name
    ? `Dr. ${user.name}`
    : 'Welcome';
  const displayClinic = clinicName ?? 'Smart Dental Desk';

  // ─── Menu structure ─────────────────────────────────────────────────────────
  const generalItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'home', tab: 'Dashboard' },
    { label: 'Patients', icon: 'people', hasChevron: true, tab: 'Patients' },
    { label: 'Appointments', icon: 'calendar', hasChevron: true, tab: 'Appointments' },
    { label: 'Rooms', icon: 'cube', hasChevron: true },
    { label: 'Treatments', icon: 'medkit', hasChevron: true },
    { label: 'Prescriptions', icon: 'document-text', hasChevron: true },
    { label: 'Invoices', icon: 'receipt', hasChevron: true, tab: 'Billing' },
    { label: 'Memberships', icon: 'shield-checkmark', hasChevron: true },
    { label: 'Expenses', icon: 'card', hasChevron: true },
    { label: 'Inventory', icon: 'cube-outline', hasChevron: true },
    { label: 'Notifications', icon: 'notifications', badge: 2 },
    { label: 'Tutorials', icon: 'school', hasChevron: true },
  ];

  const adminItems: MenuItem[] = [
    {
      label: 'Insurance',
      icon: 'shield-checkmark',
      expandable: true,
      children: [
        { label: 'Overview', icon: 'stats-chart' },
        { label: 'Enrollments', icon: 'people-outline' },
        { label: 'Pre-Auth', icon: 'checkmark-done-circle-outline' },
        { label: 'Claims', icon: 'document-outline' },
      ],
    },
    { label: 'Reports', icon: 'bar-chart' },
    { label: 'AI Insights', icon: 'sparkles', badge: 'NEW', badgeColor: 'pill' },
    { label: 'Staff', icon: 'people-circle' },
    { label: 'Branches', icon: 'business' },
    { label: 'Audit Logs', icon: 'reader' },
    { label: 'Communication', icon: 'chatbox' },
    { label: 'WhatsApp Inbox', icon: 'logo-whatsapp', tab: 'WhatsApp' },
    { label: 'Billing', icon: 'card' },
    { label: 'Settings', icon: 'settings' },
  ];

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            opacity: fade,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_W, transform: [{ translateX: slide }] },
        ]}
      >
        <View style={[styles.drawerInner, { paddingTop: insets.top }]}>
          {/* ── Top: clinic header ── */}
          <View style={styles.clinicHeader}>
            <BrandMark />
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName} numberOfLines={1}>
                {displayClinic}
              </Text>
              <Text style={styles.clinicSub} numberOfLines={1}>
                {doctorName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </View>

          {/* ── Scrollable content ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            bounces={false}
          >
            {/* General nav */}
            <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
              {generalItems.map((item) => (
                <MenuRow
                  key={item.label}
                  item={item}
                  active={activeKey === item.label}
                  expanded={false}
                  onPress={() => {
                    if (item.tab) navigateTab(item.tab);
                    else {
                      setActiveKey(item.label);
                      close();
                    }
                  }}
                  onToggleExpand={() => {}}
                />
              ))}
            </View>

            {/* Section divider */}
            <View style={styles.sectionDivider} />

            {/* Administration */}
            <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
            <View style={{ paddingHorizontal: 12 }}>
              {adminItems.map((item) => (
                <MenuRow
                  key={item.label}
                  item={item}
                  active={activeKey === item.label}
                  expanded={item.label === 'Insurance' ? insuranceExpanded : false}
                  onPress={() => {
                    if (item.tab) navigateTab(item.tab);
                    else {
                      setActiveKey(item.label);
                      close();
                    }
                  }}
                  onToggleExpand={() => setInsuranceExpanded((v) => !v)}
                />
              ))}
            </View>
          </ScrollView>

          {/* ── Bottom: dark mode + version ── */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.darkRow}>
              <Ionicons name="moon" size={18} color="#475569" />
              <Text style={styles.darkLabel}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#e2e8f0', true: '#4361EE' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={styles.version}>Version 2.0.0</Text>
          </View>
        </View>
      </Animated.View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  drawerInner: { flex: 1 },

  // Clinic header
  clinicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  clinicSub: { fontSize: 12, color: '#64748b', marginTop: 1 },

  // Section
  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginTop: 10,
    marginHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.4,
    paddingHorizontal: 22,
    marginTop: 14,
    marginBottom: 4,
  },

  // Menu row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 12,
    marginBottom: 2,
  },
  rowActive: {
    backgroundColor: '#EEF2FF',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#4361EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  rowLabelActive: { color: '#4361EE', fontWeight: '600' },

  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  badgeTextPill: { color: '#4361EE', fontSize: 10 },

  // Sub-items (insurance expanded)
  subList: {
    paddingLeft: 32,
    marginBottom: 4,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  subLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 6,
  },
  darkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  darkLabel: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },
  version: { fontSize: 11, color: '#94a3b8' },

});
