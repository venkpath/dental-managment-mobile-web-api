import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { APP_C, formUi } from '../theme/appChrome';
import { useBottomInset } from '../hooks/useBottomInset';

type PrimaryAction = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
  primaryAction?: PrimaryAction;
  footerExtra?: React.ReactNode;
  booting?: boolean;
  bootMessage?: string;
};

export function FormCard({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[formUi.card, style]}>
      {title ? <Text style={formUi.sectionLabel}>{title}</Text> : null}
      {children}
    </View>
  );
}

export default function FormScreenLayout({
  title,
  subtitle,
  onBack,
  children,
  primaryAction,
  footerExtra,
  booting,
  bootMessage = 'Loading…',
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();

  if (booting) {
    return (
      <View style={[formUi.screen, { paddingTop: insets.top }]}>
        <View style={formUi.topbar}>
          <TouchableOpacity onPress={onBack} style={formUi.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={APP_C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={formUi.topTitle}>{title}</Text>
            {subtitle ? <Text style={formUi.topSub}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={formUi.center}>
          <ActivityIndicator size="large" color={APP_C.indigo} />
          <Text style={formUi.loadingTxt}>{bootMessage}</Text>
        </View>
      </View>
    );
  }

  const scrollPad = primaryAction ? 100 + bottomInset : 24 + bottomInset;

  return (
    <KeyboardAvoidingView style={formUi.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top, backgroundColor: APP_C.bg }}>
        <View style={formUi.topbar}>
          <TouchableOpacity onPress={onBack} style={formUi.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={APP_C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={formUi.topTitle}>{title}</Text>
            {subtitle ? <Text style={formUi.topSub} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[formUi.scroll, { paddingBottom: scrollPad }]}
      >
        {children}
      </ScrollView>

      {primaryAction ? (
        <View style={[formUi.footer, { paddingBottom: Math.max(12, bottomInset) }]}>
          {footerExtra}
          <TouchableOpacity
            style={[formUi.primaryBtn, (primaryAction.loading || primaryAction.disabled) && formUi.btnDisabled]}
            onPress={primaryAction.onPress}
            disabled={primaryAction.loading || primaryAction.disabled}
            activeOpacity={0.85}
          >
            {primaryAction.loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={formUi.primaryTxt}>{primaryAction.label}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Compact input spacing inside form cards */
export const formInputWrap = StyleSheet.create({
  tight: { marginBottom: 0 },
});
