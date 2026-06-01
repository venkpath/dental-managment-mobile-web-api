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
import { spacing, typography } from '../theme';
import { APP_C } from '../theme/appChrome';

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
                  {active ? <Ionicons name="checkmark" size={18} color={APP_C.indigo} /> : null}
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
    backgroundColor: APP_C.surface,
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
    backgroundColor: APP_C.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { fontSize: typography.lg, fontWeight: '800', color: APP_C.text, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: APP_C.border,
  },
  rowActive: { backgroundColor: APP_C.indigoLight, borderRadius: 12, borderBottomWidth: 0 },
  rowLabel: { fontSize: 15, color: APP_C.text, flex: 1 },
  rowLabelActive: { fontWeight: '700', color: APP_C.indigo },
});
