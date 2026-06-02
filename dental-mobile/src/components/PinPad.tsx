import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

type Props = {
  pinLength: number;
  filled: number;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
};

export default function PinPad({ pinLength, filled, onDigit, onBackspace, disabled }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.dots}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <View key={i} style={[s.dot, i < filled && s.dotFilled]} />
        ))}
      </View>
      <View style={s.grid}>
        {KEYS.map((key, idx) => {
          if (key === '') {
            return <View key={`sp-${idx}`} style={s.keyCell} />;
          }
          if (key === 'back') {
            return (
              <TouchableOpacity
                key="back"
                style={s.keyCell}
                onPress={onBackspace}
                disabled={disabled}
                accessibilityLabel="Delete digit"
              >
                <Ionicons name="backspace-outline" size={26} color="#0f172a" />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={key}
              style={s.keyBtn}
              onPress={() => onDigit(key)}
              disabled={disabled}
            >
              <Text style={s.keyTxt}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 320, alignSelf: 'center' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 28,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
  },
  dotFilled: { backgroundColor: '#4361EE', borderColor: '#4361EE' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  keyCell: {
    width: 76,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtn: {
    width: 76,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  keyTxt: { fontSize: 24, fontWeight: '600', color: '#0f172a' },
});
