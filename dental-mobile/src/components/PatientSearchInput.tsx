import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { patientService } from '../services/patient.service';
import { colors, spacing, typography, radius, shadow } from '../theme';
import type { Patient } from '../types';

interface Props {
  label?: string;
  selectedPatient: { id: string; name: string } | null;
  onSelect: (patient: { id: string; name: string }) => void;
  error?: string;
}

export default function PatientSearchInput({ label = 'Patient *', selectedPatient, onSelect, error }: Props) {
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
      <Text style={styles.label}>{label}</Text>

      {selectedPatient?.id ? (
        // Selected state — show name chip with clear button
        <View style={[styles.selectedChip, error && styles.chipError]}>
          <View style={styles.chipLeft}>
            <Text style={styles.chipIcon}>👤</Text>
            <View>
              <Text style={styles.chipName}>{selectedPatient.name}</Text>
              <Text style={styles.chipId} numberOfLines={1}>{selectedPatient.id}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Search input
        <View style={[styles.inputWrap, error && styles.inputError]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={search}
            placeholder="Search by name or phone..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />}
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
                <Text style={styles.dropPhone}>📞 {p.phone}</Text>
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
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: typography.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 50,
  },
  inputError: { borderColor: colors.danger },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  input: { flex: 1, fontSize: typography.base, color: colors.text, paddingVertical: spacing.sm },
  spinner: { marginLeft: spacing.sm },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    minHeight: 50,
  },
  chipError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  chipLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  chipIcon: { fontSize: 18 },
  chipName: { fontSize: typography.base, fontWeight: '600', color: colors.primary },
  chipId: { fontSize: typography.xs, color: colors.textMuted, maxWidth: 220 },
  clearBtn: { padding: spacing.xs },
  clearText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  errorText: { fontSize: typography.xs, color: colors.danger, marginTop: spacing.xs, fontWeight: '500' },
  dropdown: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.xs, overflow: 'hidden', ...shadow.sm,
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  dropAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  dropAvatarText: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
  dropInfo: { flex: 1 },
  dropName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  dropPhone: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  noResults: { padding: spacing.md, alignItems: 'center' },
  noResultsText: { fontSize: typography.sm, color: colors.textMuted },
});
