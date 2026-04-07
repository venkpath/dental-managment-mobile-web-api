import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, Platform } from 'react-native';
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
        {rightElement && <View style={styles.rightEl}>{rightElement}</View>}
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
  container: { marginBottom: spacing.base },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    height: 52,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: '#ffffff',
  },
  inputWrapError: {
    borderColor: colors.danger,
    backgroundColor: '#fef2f2',
  },
  prefix: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
    ...Platform.select({
      android: { paddingTop: 0, paddingBottom: 0 },
    }),
  },
  rightEl: {
    marginLeft: spacing.sm,
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
