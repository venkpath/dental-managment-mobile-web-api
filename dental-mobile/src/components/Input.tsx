import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  prefix?: string;
  rightElement?: React.ReactNode;
}

export default function Input({ label, error, hint, containerStyle, style, prefix, rightElement, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrap,
        focused && styles.inputWrapFocused,
        !!error && styles.inputWrapError,
      ]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightElement}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    minHeight: 50,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    ...{
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  inputWrapError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  prefix: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.base,
    color: colors.text,
    fontWeight: '400',
  },
  error: {
    fontSize: typography.xs,
    color: colors.danger,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  hint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
