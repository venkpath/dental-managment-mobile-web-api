import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Pressable, Keyboard, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COUNTRY_DIAL_CODES, type CountryDial } from '../utils/countryCodes';

const { height: SH } = Dimensions.get('window');
/** Fixed sheet height so the picker does not shrink when the list is short or empty. */
const SHEET_HEIGHT = Math.round(SH * 0.78);

type Props = {
  visible: boolean;
  selected: CountryDial;
  onSelect: (country: CountryDial) => void;
  onClose: () => void;
};

export default function CountryCodePicker({ visible, selected, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_DIAL_CODES;
    return COUNTRY_DIAL_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q)
        || c.dial.includes(q)
        || c.iso.toLowerCase().includes(q)
        || `+${c.dial}`.includes(q),
    );
  }, [query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleSelect = (country: CountryDial) => {
    Keyboard.dismiss();
    setQuery('');
    onSelect(country);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={s.container}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={[s.sheet, { height: SHEET_HEIGHT, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.handle} />
          <Text style={s.title}>Select country code</Text>
          <View style={s.searchRow}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              placeholderTextColor="#94a3b8"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
          <View style={s.listArea}>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.iso}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              style={s.list}
              contentContainerStyle={[
                s.listContent,
                filtered.length === 0 && s.listContentEmpty,
              ]}
              showsVerticalScrollIndicator
              renderItem={({ item }) => {
                const active = item.iso === selected.iso;
                return (
                  <TouchableOpacity
                    style={[s.row, active && s.rowActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.flag}>{item.flag}</Text>
                    <View style={s.rowText}>
                      <Text style={[s.rowName, active && s.rowNameActive]}>{item.name}</Text>
                      <Text style={s.rowDial}>+{item.dial}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color="#4361EE" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Ionicons name="globe-outline" size={40} color="#cbd5e1" />
                  <Text style={s.empty}>No countries match your search.</Text>
                </View>
              }
            />
          </View>
          <TouchableOpacity style={s.doneBtn} onPress={handleClose} activeOpacity={0.85}>
            <Text style={s.doneTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    zIndex: 10,
    elevation: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginTop: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  listArea: { flex: 1, minHeight: 120 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingBottom: 8, flexGrow: 1 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: { backgroundColor: '#EEF2FF' },
  flag: { fontSize: 24 },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  rowNameActive: { color: '#4361EE' },
  rowDial: { fontSize: 13, color: '#64748b', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  doneBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTxt: { fontSize: 16, fontWeight: '700', color: '#4361EE' },
});
