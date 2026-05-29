import React from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function SelectSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <Text style={s.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const active = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[s.row, active && s.rowActive]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.rowLabel, active && s.rowLabelActive]}>{item.label}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { fontSize: typography.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowActive: { backgroundColor: colors.primaryLight, borderRadius: radius.md, borderBottomWidth: 0 },
  rowLabel: { fontSize: 15, color: colors.text, flex: 1 },
  rowLabelActive: { fontWeight: '700', color: colors.primaryDark },
});
