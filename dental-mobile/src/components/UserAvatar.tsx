import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { box: number; font: number; radius: number }> = {
  sm: { box: 42, font: 14, radius: 21 },
  md: { box: 72, font: 22, radius: 36 },
  lg: { box: 96, font: 28, radius: 48 },
};

type Props = {
  name?: string;
  photoUrl?: string | null;
  size?: Size;
};

function initials(name?: string): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * User avatar: shows profile_photo_url when set, otherwise initials on a colored circle.
 */
export default function UserAvatar({ name, photoUrl, size = 'md' }: Props) {
  const dim = SIZES[size];
  const label = initials(name);

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{
          width: dim.box,
          height: dim.box,
          borderRadius: dim.radius,
          backgroundColor: colors.border,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: dim.box,
          height: dim.box,
          borderRadius: dim.radius,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: dim.font }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontWeight: '700', color: colors.primary },
});
