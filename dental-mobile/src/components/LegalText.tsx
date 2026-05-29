import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { openLegalUrl } from '../utils/openLegalUrl';

const LINK_COLOR = '#4361EE';

type NoticeProps = {
  /** e.g. "By continuing" or "By signing in" */
  prefix: string;
  style?: object;
  centered?: boolean;
};

/** Inline notice with tappable Terms & Privacy links (no checkbox). */
export function LegalNotice({ prefix, style, centered }: NoticeProps) {
  return (
    <View style={[s.wrap, centered && s.centered, style]}>
      <Text style={[s.body, centered && s.bodyCentered]}>
        {prefix},{' '}
        you agree to our{' '}
        <Text style={s.link} onPress={() => openLegalUrl('terms')}>
          Terms of Service
        </Text>
        {' '}and{' '}
        <Text style={s.link} onPress={() => openLegalUrl('privacy')}>
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

type AgreementProps = {
  checked: boolean;
  onToggle: () => void;
  style?: object;
};

/** Required checkbox for registration / account creation. */
export function LegalAgreement({ checked, onToggle, style }: AgreementProps) {
  return (
    <View style={[s.agreeRow, style]}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View style={[s.checkbox, checked && s.checkboxOn]}>
          {checked && <Text style={s.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <Text style={s.agreeBody}>
        I agree to the{' '}
        <Text style={s.link} onPress={() => openLegalUrl('terms')}>
          Terms of Service
        </Text>
        {' '}and{' '}
        <Text style={s.link} onPress={() => openLegalUrl('privacy')}>
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

type LinkRowProps = {
  onTerms?: () => void;
  onPrivacy?: () => void;
  onRefund?: () => void;
};

/** Stacked legal links for settings / More menu. */
export function LegalLinkList({ onTerms, onPrivacy, onRefund }: LinkRowProps) {
  const items: { label: string; kind: 'terms' | 'privacy' | 'refund' }[] = [
    { label: 'Terms of Service', kind: 'terms' },
    { label: 'Privacy Policy', kind: 'privacy' },
    { label: 'Refund Policy', kind: 'refund' },
  ];
  return (
    <View style={s.linkList}>
      {items.map((item, idx) => (
        <TouchableOpacity
          key={item.kind}
          style={[s.linkRow, idx < items.length - 1 && s.linkRowBorder]}
          onPress={() => {
            if (item.kind === 'terms' && onTerms) onTerms();
            else if (item.kind === 'privacy' && onPrivacy) onPrivacy();
            else if (item.kind === 'refund' && onRefund) onRefund();
            else openLegalUrl(item.kind);
          }}
          activeOpacity={0.7}
        >
          <Text style={s.linkRowLabel}>{item.label}</Text>
          <Text style={s.linkRowChevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 4 },
  centered: { alignItems: 'center' },
  body: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  bodyCentered: { textAlign: 'center' },
  link: { color: LINK_COLOR, fontWeight: '600' },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, marginBottom: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#c7d7ff',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: LINK_COLOR, borderColor: LINK_COLOR },
  checkMark: { fontSize: 12, fontWeight: '800', color: '#fff', lineHeight: 14 },
  agreeBody: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },
  linkList: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  linkRowLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  linkRowChevron: { fontSize: 18, color: '#94a3b8', fontWeight: '300' },
});
