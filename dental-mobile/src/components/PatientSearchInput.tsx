import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { patientService } from '../services/patient.service';
import { APP_C } from '../theme/appChrome';
import { spacing, typography, radius, shadow } from '../theme';
import type { Patient } from '../types';

interface Props {
  label?: string;
  selectedPatient: { id: string; name: string } | null;
  onSelect: (patient: { id: string; name: string }) => void;
  error?: string;
}

export default function PatientSearchInput({ label, selectedPatient, onSelect, error }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim() || text.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await patientService.list(1, text.trim());
        setResults(res.data || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const handleSelect = (patient: Patient) => {
    onSelect({ id: patient.id, name: `${patient.first_name} ${patient.last_name}` });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSelect({ id: '', name: '' });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {selectedPatient?.id ? (
        <View style={[styles.selectedChip, error && styles.chipError]}>
          <View style={styles.chipLeft}>
            <View style={styles.chipAvatar}>
              <Ionicons name="person" size={18} color={APP_C.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chipName}>{selectedPatient.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={APP_C.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.inputWrap, error && styles.inputError]}>
          <Ionicons name="search" size={18} color={APP_C.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={search}
            placeholder="Search by name or phone..."
            placeholderTextColor={APP_C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator size="small" color={APP_C.indigo} style={styles.spinner} /> : null}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.dropItem}
              onPress={() => handleSelect(p)}
            >
              <View style={styles.dropAvatar}>
                <Text style={styles.dropAvatarText}>
                  {p.first_name[0]}{p.last_name[0]}
                </Text>
              </View>
              <View style={styles.dropInfo}>
                <Text style={styles.dropName}>{p.first_name} {p.last_name}</Text>
                <Text style={styles.dropPhone}>{p.phone}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showDropdown && results.length === 0 && !searching && query.length >= 2 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No patients found for "{query}"</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 0 },
  label: { fontSize: 13, fontWeight: '600', color: APP_C.textSub, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: APP_C.bg, borderWidth: 1, borderColor: APP_C.border,
    borderRadius: 12, paddingHorizontal: 12, minHeight: 48,
  },
  inputError: { borderColor: APP_C.red },
  searchIcon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: typography.base, color: APP_C.text, paddingVertical: spacing.sm },
  spinner: { marginLeft: spacing.sm },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: APP_C.indigoLight, borderWidth: 1, borderColor: '#c7d2fe',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 48,
  },
  chipError: { borderColor: APP_C.red, backgroundColor: APP_C.redLight },
  chipLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chipAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: APP_C.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  chipName: { fontSize: 15, fontWeight: '700', color: APP_C.indigo },
  clearBtn: { padding: 2 },
  errorText: { fontSize: 12, color: APP_C.red, marginTop: 4, fontWeight: '500' },
  dropdown: {
    backgroundColor: APP_C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: APP_C.border,
    marginTop: spacing.xs, overflow: 'hidden', ...shadow.sm,
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1, borderBottomColor: APP_C.divider,
  },
  dropAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: APP_C.indigoLight, alignItems: 'center', justifyContent: 'center',
  },
  dropAvatarText: { fontSize: typography.sm, fontWeight: '700', color: APP_C.indigo },
  dropInfo: { flex: 1 },
  dropName: { fontSize: typography.base, fontWeight: '600', color: APP_C.text },
  dropPhone: { fontSize: typography.xs, color: APP_C.textSub, marginTop: 1 },
  noResults: { padding: spacing.md, alignItems: 'center' },
  noResultsText: { fontSize: typography.sm, color: APP_C.textMuted },
});
