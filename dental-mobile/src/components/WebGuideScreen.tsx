import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDrawer } from './DrawerMenu';
import { useBottomInset } from '../hooks/useBottomInset';

export const WEB_APP_URL = 'https://smartdentaldesk.com/login';

export interface WebGuideFeature {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}

export interface WebGuideConfig {
  title: string;
  subtitle: string;
  heroIcon: React.ComponentProps<typeof Ionicons>['name'];
  heroTitle: string;
  heroText: string;
  features: WebGuideFeature[];
  webUrl?: string;
  tipText?: string;
}

const C = {
  indigo: '#4361EE', indigoLight: '#EEF2FF',
  bg: '#F8FAFC', surface: '#ffffff',
  text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  border: '#E2E8F0',
};

interface Props {
  config: WebGuideConfig;
}

export default function WebGuideScreen({ config }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();
  const url = config.webUrl ?? WEB_APP_URL;

  const openWeb = async () => {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('Cannot open link', url);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open the page in your browser.');
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={openDrawer} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.title}>{config.title}</Text>
          <Text style={s.subtitle}>{config.subtitle}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: 24 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Ionicons name={config.heroIcon} size={32} color={C.indigo} />
          </View>
          <Text style={s.heroTitle}>{config.heroTitle}</Text>
          <Text style={s.heroText}>{config.heroText}</Text>
        </View>

        <View style={s.featureList}>
          {config.features.map((f) => (
            <View key={f.label} style={s.featureRow}>
              <Ionicons name={f.icon} size={18} color={C.indigo} />
              <Text style={s.featureTxt}>{f.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={openWeb} activeOpacity={0.85}>
          <Ionicons name="open-outline" size={20} color="#fff" />
          <Text style={s.primaryTxt}>Open Smart Dental Desk</Text>
        </TouchableOpacity>

        <Text style={s.urlHint}>{url}</Text>

        {config.tipText ? (
          <View style={s.tipCard}>
            <Ionicons name="phone-portrait-outline" size={18} color={C.textSub} />
            <Text style={s.tipTxt}>{config.tipText}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 11, color: C.textSub, marginTop: 1 },
  body: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: C.indigoLight,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center' },
  heroText: { fontSize: 14, color: C.textSub, lineHeight: 21, textAlign: 'center' },
  featureList: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: C.border,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureTxt: { fontSize: 14, color: C.text, fontWeight: '500', flex: 1 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 16,
  },
  primaryTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  urlHint: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  tipCard: {
    flexDirection: 'row', gap: 10, backgroundColor: C.indigoLight, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#c7d2fe',
  },
  tipTxt: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18 },
});
