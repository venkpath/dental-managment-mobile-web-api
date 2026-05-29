import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LegalNotice } from '../../components/LegalText';
import type { AuthStackParamList } from '../../types';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = Math.round(SH * 0.48);

const LOGO_BLUE = '#0891b2';
const LOGO_GREEN = '#059669';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const PURPLE = '#635BFF';
const PURPLE_DARK = '#4F46E5';

const FEATURES: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  iconBg: string;
  iconColor: string;
}[] = [
  { icon: 'calendar', label: 'Schedule', iconBg: '#EDE9FE', iconColor: PURPLE },
  { icon: 'people', label: 'Patients', iconBg: '#EEF2FF', iconColor: '#4361EE' },
  { icon: 'document-text', label: 'Billing', iconBg: '#E0F2FE', iconColor: '#4361EE' },
  { icon: 'logo-whatsapp', label: 'WhatsApp', iconBg: '#DCFCE7', iconColor: '#25D366' },
];

function useStagger(delayMs: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, opacity, translateY]);

  return { opacity, transform: [{ translateY }] };
}

function FadeIn({
  delay,
  style,
  children,
}: {
  delay: number;
  style?: object;
  children: React.ReactNode;
}) {
  const anim = useStagger(delay);
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const panelBottomPad = Math.max(insets.bottom, 12) + 16;

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={['#F3F0FF', '#F5F3FF', '#FAFAFC']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.hero}>
        <SafeAreaView edges={['top']} style={s.heroTop}>
          <FadeIn delay={0} style={s.logoCenterWrap}>
            <View style={s.brandRow}>
              <Image
                source={require('../../../assets/only_logo.png')}
                style={s.brandMark}
                resizeMode="contain"
              />
              <View style={s.brandText}>
                <Text style={s.brandSmart}>Smart</Text>
                <Text style={s.brandDental}>Dental Desk</Text>
              </View>
            </View>
          </FadeIn>
        </SafeAreaView>

        <FadeIn delay={100} style={s.illustrationWrap}>
          <View style={s.archBackdrop}>
            <LinearGradient
              colors={['rgba(167, 139, 250, 0.22)', 'rgba(8, 145, 178, 0.1)', 'rgba(248, 250, 252, 0)']}
              locations={[0, 0.55, 1]}
              style={s.heroArch}
            />
            <View style={s.archFloor} />
          </View>
          <Image
            source={require('../../../assets/dental_chair.png')}
            style={s.heroImg}
            resizeMode="contain"
          />
        </FadeIn>
      </View>

      <View style={s.panelShell}>
        <View style={[s.panel, { paddingBottom: panelBottomPad }]}>
        <FadeIn delay={180} style={s.headlineWrap}>
          <Text style={s.headline}>
            <Text style={s.headlineDark}>Practice management, </Text>
            <Text style={s.headlineAccent}>simplified</Text>
          </Text>
          <Text style={s.sub}>
            Appointments, patients, billing & WhatsApp — all in one place.
          </Text>
        </FadeIn>

        <FadeIn delay={260} style={s.featureRow}>
          {FEATURES.map((f) => (
            <View key={f.label} style={s.featureTile}>
              <View style={[s.featureIconBox, { backgroundColor: f.iconBg }]}>
                <Ionicons name={f.icon} size={22} color={f.iconColor} />
              </View>
              <Text style={s.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </FadeIn>

        <FadeIn delay={340} style={s.actions}>
          <TouchableOpacity
            style={s.primaryWrap}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={[PURPLE, '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.primaryBtn}
            >
              <Text style={s.primaryTxt}>Sign in</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Register')}
          >
            <Ionicons name="add-circle-outline" size={20} color={PURPLE} />
            <Text style={s.secondaryTxt}>Register your clinic</Text>
          </TouchableOpacity>
        </FadeIn>

        <View style={s.footerBlock}>
          <FadeIn delay={420} style={s.trustRow}>
            <View style={s.trustItem}>
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
              <Text style={s.trustTxt}>14-day free trial</Text>
            </View>
            <View style={s.trustItem}>
              <Ionicons name="lock-closed" size={14} color={PURPLE} />
              <Text style={s.trustTxt}>Secure</Text>
            </View>
            <View style={s.trustItem}>
              <Ionicons name="people" size={15} color={PURPLE} />
              <Text style={s.trustTxt}>500+ clinics</Text>
            </View>
          </FadeIn>

          <FadeIn delay={480}>
            <LegalNotice prefix="By using this app" centered style={s.legalNotice} />
          </FadeIn>
        </View>
        </View>
      </View>
    </View>
  );
}

const TILE = (SW - 48 - 36) / 4;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFC' },
  hero: {
    height: HERO_H,
    alignItems: 'center',
  },
  heroTop: {
    width: '100%',
    alignItems: 'center',
  },
  logoCenterWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  brandMark: { width: 56, height: 56 },
  brandText: { justifyContent: 'center' },
  brandSmart: {
    fontSize: 30,
    fontWeight: '800',
    color: LOGO_BLUE,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  brandDental: {
    fontSize: 18,
    fontWeight: '700',
    color: LOGO_GREEN,
    lineHeight: 22,
    marginTop: 2,
  },
  illustrationWrap: {
    flex: 1,
    width: SW,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingBottom: 2,
  },
  archBackdrop: {
    position: 'absolute',
    bottom: 40,
    width: SW,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heroArch: {
    width: SW * 0.92,
    height: SW * 0.46,
    borderTopLeftRadius: SW * 0.46,
    borderTopRightRadius: SW * 0.46,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  archFloor: {
    width: SW * 0.72,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    marginTop: -6,
    marginBottom: 4,
  },
  heroImg: {
    width: SW - 36,
    height: HERO_H - 100,
    maxHeight: 280,
    marginBottom: -18,
  },
  panelShell: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  panel: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  headlineWrap: { marginBottom: 20 },
  headline: { textAlign: 'center', lineHeight: 36 },
  headlineDark: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  headlineAccent: {
    fontSize: 28,
    fontWeight: '800',
    color: PURPLE,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  featureTile: { width: TILE, alignItems: 'center', gap: 8 },
  featureIconBox: {
    width: TILE - 4,
    height: TILE - 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  actions: { width: '100%', marginBottom: 4 },
  footerBlock: { marginTop: 10 },
  primaryWrap: {
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: PURPLE_DARK,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 999,
  },
  primaryTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    backgroundColor: '#fff',
  },
  secondaryTxt: { fontSize: 16, fontWeight: '700', color: PURPLE },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 0,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustTxt: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  legalNotice: { marginTop: 10, paddingHorizontal: 8 },
});
