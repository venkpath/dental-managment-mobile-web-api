import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, Platform } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { APP_C } from '../theme/appChrome';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  prefix?: string;
  rightElement?: React.ReactNode;
}

export default function Input({ label, error, hint, containerStyle, style, prefix, rightElement, multiline, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const isMultiline = !!multiline;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputWrap,
        isMultiline && styles.inputWrapMultiline,
        focused && styles.inputWrapFocused,
        !!error && styles.inputWrapError,
      ]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, isMultiline && styles.inputMultiline, style]}
          placeholderTextColor={APP_C.textMuted}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightElement ? <View style={styles.rightEl}>{rightElement}</View> : null}
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
    fontSize: 13,
    fontWeight: '600',
    color: APP_C.textSub,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_C.bg,
    borderWidth: 1,
    borderColor: APP_C.border,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    minHeight: 52,
    height: 52,
  },
  inputWrapMultiline: {
    height: undefined,
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  inputWrapFocused: {
    borderColor: APP_C.indigo,
    backgroundColor: APP_C.surface,
  },
  inputWrapError: {
    borderColor: APP_C.red,
    backgroundColor: APP_C.redLight,
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
    color: APP_C.text,
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'center',
    ...Platform.select({
      android: { paddingTop: 0, paddingBottom: 0 },
    }),
  },
  inputMultiline: {
    minHeight: 72,
    height: undefined,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'android' ? 4 : 2,
    paddingBottom: Platform.OS === 'android' ? 4 : 2,
  },
  rightEl: {
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: 12,
    color: APP_C.red,
    marginTop: 4,
    fontWeight: '500',
  },
  hint: {
    fontSize: typography.xs,
    color: APP_C.textMuted,
    marginTop: spacing.xs,
  },
});
