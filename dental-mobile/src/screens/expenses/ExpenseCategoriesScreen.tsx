import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { expenseService } from '../../services/expense.service';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';
import { useBottomInset } from '../../hooks/useBottomInset';
import { canManageExpenses } from '../../utils/permissions';
import { useAuthStore } from '../../store/auth.store';
import type { ExpenseCategory, BillingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<BillingStackParamList>;

export default function ExpenseCategoriesScreen() {
  const navigation = useNavigation<Nav>();
  const bottomInset = useBottomInset();
  const { user } = useAuthStore();
  const canEdit = canManageExpenses(user?.role);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    expenseService.getCategories()
      .then(setCategories)
      .catch(() => Alert.alert('Error', 'Could not load categories'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await expenseService.createCategory({ name: newName.trim() });
      setNewName('');
      load();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: ExpenseCategory) => {
    if (cat.is_default) return;
    try {
      await expenseService.updateCategory(cat.id, { is_active: !cat.is_active });
      load();
    } catch {
      Alert.alert('Error', 'Could not update category');
    }
  };

  const handleDelete = (cat: ExpenseCategory) => {
    if (cat.is_default) return;
    Alert.alert('Delete category', `Remove "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseService.deleteCategory(cat.id);
            load();
          } catch (err: unknown) {
            Alert.alert('Cannot delete', err instanceof Error ? err.message : 'Category has expenses or is protected');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Expense categories" subtitle="Manage custom categories" onBack={() => navigation.goBack()} />
      {canEdit ? (
        <View style={s.addRow}>
          <TextInput
            style={s.addInput}
            placeholder="New category name"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
          />
          <Button title="Add" onPress={handleAdd} loading={saving} />
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomInset + 24, gap: 8 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                {item.is_default ? <Text style={s.badge}>Default</Text> : null}
              </View>
              {canEdit && !item.is_default ? (
                <>
                  <Switch
                    value={item.is_active}
                    onValueChange={() => toggleActive(item)}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={item.is_active ? colors.primary : '#f4f4f5'}
                  />
                  <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  addRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: 'center' },
  addInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  badge: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
