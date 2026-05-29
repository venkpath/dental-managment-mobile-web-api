import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService } from '../../services/patient.service';
import { insightsService } from '../../services/insights.service';
import EmptyState from '../../components/EmptyState';
import { useBottomInset } from '../../hooks/useBottomInset';
import { useDrawer } from '../../components/DrawerMenu';
import { exportData, type ExportFormat, type ExportColumn } from '../../utils/export';
import type { Patient, PatientStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const FILTERS = [
  { label: 'All Patients', value: 'all' },
  { label: 'Male',         value: 'Male' },
  { label: 'Female',       value: 'Female' },
  { label: 'Other',        value: 'Other' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarPalette(g?: string): { bg: string; text: string } {
  if (g === 'Female') return { bg: '#FCE7F3', text: '#BE185D' };
  if (g === 'Other')  return { bg: '#F1F5F9', text: '#64748B' };
  return { bg: '#E0E7FF', text: '#4F46E5' };
}

function genderStyle(g?: string) {
  if (g === 'Female') return { bg: '#FCE7F3', text: '#DB2777' };
  if (g === 'Other')  return { bg: '#F1F5F9', text: '#64748B' };
  return { bg: '#DBEAFE', text: '#2563EB' };
}

async function callPhone(phone: string) {
  const cleaned = phone.replace(/[\s()-]/g, '');
  const url = `tel:${cleaned}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('Cannot place call', 'No phone app is available on this device.');
  } catch {
    Alert.alert('Cannot place call', 'Something went wrong opening the dialer.');
  }
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s()-]/g, '');
  const match = cleaned.match(/^(\+91)(\d{5})(\d{5})$/);
  if (match) return `${match[1]} ${match[2]} ${match[3]}`;
  const local = cleaned.match(/^(\d{5})(\d{5})$/);
  if (local) return `${local[1]} ${local[2]}`;
  return phone;
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Action Sheet (View / Edit / Delete) ─────────────────────────────────────

function PatientActionSheet({
  patient,
  onClose,
  onView,
  onEdit,
  onDelete,
}: {
  patient: Patient | null;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!patient) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.actionSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetName} numberOfLines={1}>{patient.first_name} {patient.last_name}</Text>
            <Text style={styles.sheetPhone}>{formatPhone(patient.phone)}</Text>
          </View>

          <TouchableOpacity style={styles.sheetItem} onPress={onView} activeOpacity={0.7}>
            <View style={[styles.sheetIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="eye" size={18} color="#4361EE" />
            </View>
            <View style={styles.sheetTextBlock}>
              <Text style={styles.sheetItemLabel}>View Details</Text>
              <Text style={styles.sheetItemSub}>Open the patient profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetItem} onPress={onEdit} activeOpacity={0.7}>
            <View style={[styles.sheetIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="create" size={18} color="#15803D" />
            </View>
            <View style={styles.sheetTextBlock}>
              <Text style={styles.sheetItemLabel}>Edit Patient</Text>
              <Text style={styles.sheetItemSub}>Update phone, email, gender…</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetItem} onPress={onDelete} activeOpacity={0.7}>
            <View style={[styles.sheetIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash" size={18} color="#DC2626" />
            </View>
            <View style={styles.sheetTextBlock}>
              <Text style={[styles.sheetItemLabel, { color: '#DC2626' }]}>Delete Patient</Text>
              <Text style={styles.sheetItemSub}>Permanently remove all records</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetCancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.sheetCancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Export Format Picker ────────────────────────────────────────────────────

function ExportFormatPicker({
  visible,
  busy,
  onClose,
  onPick,
}: {
  visible: boolean;
  busy: ExportFormat | null;
  onClose: () => void;
  onPick: (fmt: ExportFormat) => void;
}) {
  const items: Array<{ key: ExportFormat; label: string; sub: string; icon: React.ComponentProps<typeof Ionicons>['name']; iconBg: string; iconColor: string }> = [
    { key: 'csv',   label: 'CSV',   sub: 'Open with Numbers, Sheets, Excel', icon: 'document-text', iconBg: '#DBEAFE', iconColor: '#2563EB' },
    { key: 'excel', label: 'Excel', sub: '.xlsx file with formatting',        icon: 'grid',          iconBg: '#DCFCE7', iconColor: '#15803D' },
    { key: 'pdf',   label: 'PDF',   sub: 'Printable, ready to email',         icon: 'document',      iconBg: '#FEE2E2', iconColor: '#DC2626' },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.actionSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetName}>Export Patients</Text>
            <Text style={styles.sheetPhone}>Pick a format to share</Text>
          </View>

          {items.map((it) => {
            const isBusy = busy === it.key;
            const disabled = !!busy && !isBusy;
            return (
              <TouchableOpacity
                key={it.key}
                style={[styles.sheetItem, disabled && { opacity: 0.4 }]}
                onPress={() => onPick(it.key)}
                activeOpacity={0.7}
                disabled={!!busy}
              >
                <View style={[styles.sheetIcon, { backgroundColor: it.iconBg }]}>
                  <Ionicons name={it.icon} size={18} color={it.iconColor} />
                </View>
                <View style={styles.sheetTextBlock}>
                  <Text style={styles.sheetItemLabel}>{it.label}</Text>
                  <Text style={styles.sheetItemSub}>{it.sub}</Text>
                </View>
                {isBusy
                  ? <ActivityIndicator size="small" color={it.iconColor} />
                  : <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.sheetCancel}
            onPress={onClose}
            activeOpacity={0.7}
            disabled={!!busy}
          >
            <Text style={styles.sheetCancelTxt}>{busy ? 'Generating…' : 'Cancel'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Header (extracted from FlatList — fixes search focus loss) ──────────────

interface HeaderProps {
  searchInput: string;
  onSearchChange: (v: string) => void;
  filterLabel: string;
  onOpenFilter: () => void;
  onExport: () => void;
}
const ListTopHeader = React.memo(function ListTopHeader({
  searchInput,
  onSearchChange,
  filterLabel,
  onOpenFilter,
  onExport,
}: HeaderProps) {
  return (
    <View style={styles.headerWrap}>
      {/* Search + filter button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or email..."
            placeholderTextColor="#94a3b8"
            value={searchInput}
            onChangeText={onSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7} onPress={onOpenFilter}>
          <Ionicons name="funnel-outline" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Filter chip + Export (single row — saves vertical space) */}
      <View style={styles.filterChipRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={onOpenFilter} style={styles.filterChip}>
          <Text style={styles.filterChipTxt}>{filterLabel}</Text>
          <Ionicons name="chevron-down" size={14} color="#0f172a" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onExport} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-outline" size={14} color="#059669" />
          <Text style={styles.actionLbl}>Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Indeterminate progress bar (page transitions) ──────────────────────────

function IndeterminateBar() {
  const x = useRef(new Animated.Value(-0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 900,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  return (
    <View style={styles.progressBarTrack}>
      <Animated.View
        style={[
          styles.progressBarFill,
          {
            transform: [
              {
                translateX: x.interpolate({
                  inputRange: [-0.5, 1],
                  outputRange: [-160, 600],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

// ─── PaginationBar (stable, lives outside FlatList) ─────────────────────────

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPickPageSize: () => void;
}
const PaginationBar = React.memo(function PaginationBar({
  page, pageSize, total, totalPages, onPageChange, onPickPageSize,
}: PaginationBarProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Windowed page list (max 3 numeric buttons)
  const maxShow = 3;
  let start = Math.max(1, Math.min(page - 1, totalPages - maxShow + 1));
  if (start < 1) start = 1;
  const pageNumbers: number[] = [];
  for (let i = start; i < start + maxShow && i <= totalPages; i++) pageNumbers.push(i);

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <View style={styles.pagWrap}>
      {/* Row 1: count + per-page selector */}
      <View style={styles.pagRow}>
        <Text style={styles.pagShowing}>
          Showing <Text style={styles.pagBold}>{from}</Text>–
          <Text style={styles.pagBold}>{to}</Text> of{' '}
          <Text style={styles.pagBold}>{total}</Text>
        </Text>
        <TouchableOpacity style={styles.perPagePill} onPress={onPickPageSize} activeOpacity={0.7}>
          <Text style={styles.perPageTxt}>{pageSize} / page</Text>
          <Ionicons name="chevron-down" size={12} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Row 2: Prev | numbers | Next */}
      <View style={styles.pagNavRow}>
        <TouchableOpacity
          style={[styles.pageBtnLg, prevDisabled && styles.pageBtnDisabled]}
          disabled={prevDisabled}
          onPress={() => onPageChange(page - 1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={14} color={prevDisabled ? '#cbd5e1' : '#475569'} />
          <Text style={[styles.pageNavTxt, prevDisabled && { color: '#cbd5e1' }]}>Prev</Text>
        </TouchableOpacity>

        <View style={styles.pageNumGroup}>
          {pageNumbers.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.pageBtn, p === page && styles.pageBtnActive]}
              onPress={() => onPageChange(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageBtnTxt, p === page && styles.pageBtnTxtActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.pageBtnLg, nextDisabled && styles.pageBtnDisabled]}
          disabled={nextDisabled}
          onPress={() => onPageChange(page + 1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pageNavTxt, nextDisabled && { color: '#cbd5e1' }]}>Next</Text>
          <Ionicons name="chevron-forward" size={14} color={nextDisabled ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PatientListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { open: openDrawer } = useDrawer();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [churnIds, setChurnIds] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [total, setTotal] = useState(0);
  // totalPages is DERIVED — single source of truth (impossible to go out of sync)
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );
  const [loadError, setLoadError] = useState(false);
  const [actionTarget, setActionTarget] = useState<Patient | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [pageTransition, setPageTransition] = useState(false);
  const fetchSeq = useRef(0);
  // Cache loaded pages so navigating back is instant. Keyed by `${q}|${limit}|${page}`.
  const pageCache = useRef<Map<string, { rows: Patient[]; total: number }>>(new Map());

  const cacheKey = (p: number, q: string, limit: number) => `${q}|${limit}|${p}`;

  const loadPatients = useCallback(async (p = 1, q = '', limit = DEFAULT_PAGE_SIZE, refresh = false) => {
    const seq = ++fetchSeq.current;
    const key = cacheKey(p, q, limit);
    const cached = pageCache.current.get(key);

    // Instant render from cache — show stale data immediately, then refresh in background.
    if (cached && !refresh) {
      setPatients(cached.rows);
      setTotal(cached.total);
      setPage(p);
      setInitialLoading(false);
      // No transition flag — it's instant
    } else {
      // Mark this as a page transition (not initial), so we keep the existing list visible
      // with a subtle loader instead of going blank.
      if (refresh) setRefreshing(true);
      else if (!initialLoading) setPageTransition(true);
    }

    try {
      const res = await patientService.list(p, q, limit);
      if (seq !== fetchSeq.current) return;
      setLoadError(false);
      const rows = res.data || [];
      const tot = res.meta?.total ?? rows.length;
      setPatients(rows);
      setTotal(tot);
      setPage(p);
      pageCache.current.set(key, { rows, total: tot });
    } catch {
      if (seq === fetchSeq.current && p === 1 && !cached) setLoadError(true);
    } finally {
      if (seq === fetchSeq.current) {
        setInitialLoading(false);
        setRefreshing(false);
        setPageTransition(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invalidate the cache whenever the underlying query changes (search/limit/total mutation)
  const invalidatePageCache = useCallback(() => {
    pageCache.current.clear();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // When search query changes, invalidate cache (results differ entirely)
  useEffect(() => {
    invalidatePageCache();
  }, [debouncedSearch, pageSize, invalidatePageCache]);

  useFocusEffect(
    useCallback(() => {
      loadPatients(1, debouncedSearch, pageSize);
      insightsService.getHighChurnPatientIds().then(setChurnIds).catch(() => {});
    }, [loadPatients, debouncedSearch, pageSize])
  );

  const onRefresh = () => loadPatients(page, debouncedSearch, pageSize, true);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadPatients(p, debouncedSearch, pageSize);
  };

  const changePageSize = (n: number) => {
    setPageSize(n);
    setPageSizeOpen(false);
    loadPatients(1, debouncedSearch, n);
  };

  // ── Export columns (shared by CSV/Excel/PDF) ──
  const exportColumns: ExportColumn<Patient>[] = useMemo(() => [
    { key: 'first_name',   header: 'First Name' },
    { key: 'last_name',    header: 'Last Name' },
    { key: 'phone',        header: 'Phone' },
    { key: 'email',        header: 'Email',         format: (p) => p.email ?? '' },
    { key: 'gender',       header: 'Gender',        format: (p) => p.gender ?? '' },
    { key: 'date_of_birth',header: 'Date of Birth', format: (p) => p.date_of_birth ?? '' },
    { key: 'created_at',   header: 'Registered',    format: (p) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '' },
  ], []);

  const handleExportPick = async (fmt: ExportFormat) => {
    if (visiblePatients.length === 0) {
      Alert.alert('Nothing to export', 'There are no patients to export.');
      return;
    }
    setExporting(fmt);
    try {
      await exportData(fmt, visiblePatients, exportColumns, 'patients', 'Patients Report');
      setExportOpen(false);
    } catch (err) {
      const e = err as { message?: string };
      Alert.alert('Export failed', e?.message ?? 'Could not generate or share the file.');
    } finally {
      setExporting(null);
    }
  };

  const filterLabel = useMemo(
    () => FILTERS.find((f) => f.value === filter)?.label ?? 'All Patients',
    [filter]
  );

  const visiblePatients = useMemo(() => {
    if (filter === 'all') return patients;
    return patients.filter((p) => p.gender === filter);
  }, [patients, filter]);

  const initials = (p: Patient) =>
    `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || 'P';

  // ── Patient Row ──
  const renderItem = useCallback(({ item }: { item: Patient }) => {
    const init = initials(item);
    const av = avatarPalette(item.gender);
    const gs = genderStyle(item.gender);
    const highChurn = churnIds.has(item.id);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}
        activeOpacity={0.7}
        style={styles.card}
      >
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>{init}</Text>
          </View>

          <View style={styles.identity}>
            <View style={styles.topLine}>
              <Text style={styles.name} numberOfLines={1}>
                {item.first_name} {item.last_name}
              </Text>
              <TouchableOpacity
                style={styles.kebab}
                hitSlop={8}
                onPress={(e) => { e.stopPropagation?.(); setActionTarget(item); }}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.phoneRow}
              onPress={(e) => { e.stopPropagation?.(); callPhone(item.phone); }}
              activeOpacity={0.5}
              hitSlop={6}
            >
              <Ionicons name="call-outline" size={12} color="#4361EE" />
              <Text style={styles.phone}>{formatPhone(item.phone)}</Text>
            </TouchableOpacity>

            <View style={styles.metaRow}>
              {item.gender && (
                <View style={[styles.genderPill, { backgroundColor: gs.bg }]}>
                  <Text style={[styles.genderTxt, { color: gs.text }]}>{item.gender}</Text>
                </View>
              )}
              {highChurn && (
                <View style={styles.churnPill}>
                  <Ionicons name="alert-circle" size={10} color="#dc2626" />
                  <Text style={styles.churnTxt}>High Churn</Text>
                </View>
              )}
              <View style={styles.metaSpacer} />
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [churnIds, navigation]);


  // ── Action sheet handlers ──
  const handleView = () => {
    if (!actionTarget) return;
    const id = actionTarget.id;
    setActionTarget(null);
    navigation.navigate('PatientDetail', { patientId: id });
  };
  const handleEdit = () => {
    if (!actionTarget) return;
    const id = actionTarget.id;
    setActionTarget(null);
    navigation.navigate('EditPatient', { patientId: id });
  };
  const handleDelete = () => {
    if (!actionTarget) return;
    const target = actionTarget;
    setActionTarget(null);
    Alert.alert(
      'Delete patient?',
      `Permanently delete ${target.first_name} ${target.last_name} and all their records? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await patientService.delete(target.id);
              setPatients((prev) => prev.filter((p) => p.id !== target.id));
              setTotal((t) => Math.max(0, t - 1));
              invalidatePageCache();
            } catch (e: unknown) {
              const err = e as { message?: string };
              Alert.alert('Delete failed', err?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={openDrawer} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Patients</Text>
          <Text style={styles.subtitle}>Manage your patient records</Text>
        </View>
        <TouchableOpacity
          style={styles.addPatientBtn}
          onPress={() => navigation.navigate('AddPatient')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addPatientLbl}>Add Patient</Text>
        </TouchableOpacity>
      </View>

      {/* ── Header (stable — stays mounted across re-renders) ── */}
      <ListTopHeader
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filterLabel={filterLabel}
        onOpenFilter={() => setFilterOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      {/* ── List ── */}
      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4361EE" />
        </View>
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Animated progress bar at the top of the list during page transitions */}
          {pageTransition && <IndeterminateBar />}
          <FlatList
            data={visiblePatients}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={[{ flex: 1 }, pageTransition && { opacity: 0.55 }]}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4361EE']} />}
            ListEmptyComponent={
              loadError ? (
                <EmptyState title="Failed to load" subtitle="Pull down to retry" icon="alert-circle" />
              ) : (
                <EmptyState
                  title="No patients found"
                  subtitle={debouncedSearch ? `No results for "${debouncedSearch}"` : 'Add your first patient to get started'}
                  icon="people-outline"
                />
              )
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
          />
        </View>
      )}

      {/* ── Pagination (fixed at bottom, outside FlatList) ── */}
      {!initialLoading && total > 0 && (
        <View
          style={[styles.pagFooter, { paddingBottom: 12 + bottomInset }]}
          pointerEvents={pageTransition ? 'none' : 'auto'}
        >
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={goToPage}
            onPickPageSize={() => setPageSizeOpen(true)}
          />
        </View>
      )}

      {/* ── Filter dropdown ── */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)}>
          <View style={[styles.filterMenu, { marginTop: insets.top + 180 }]}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterMenuItem, filter === f.value && styles.filterMenuItemActive]}
                onPress={() => { setFilter(f.value); setFilterOpen(false); }}
              >
                <Text style={[styles.filterMenuTxt, filter === f.value && styles.filterMenuTxtActive]}>
                  {f.label}
                </Text>
                {filter === f.value && <Ionicons name="checkmark" size={16} color="#4361EE" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Row action sheet ── */}
      <PatientActionSheet
        patient={actionTarget}
        onClose={() => setActionTarget(null)}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* ── Export format picker ── */}
      <ExportFormatPicker
        visible={exportOpen}
        busy={exporting}
        onClose={() => { if (!exporting) setExportOpen(false); }}
        onPick={handleExportPick}
      />

      {/* ── Page size picker ── */}
      <Modal visible={pageSizeOpen} transparent animationType="fade" onRequestClose={() => setPageSizeOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPageSizeOpen(false)}>
          <Pressable style={styles.actionSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetName}>Items per page</Text>
              <Text style={styles.sheetPhone}>Choose how many patients to show</Text>
            </View>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                style={styles.sheetItem}
                onPress={() => changePageSize(n)}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={{ color: '#4361EE', fontSize: 14, fontWeight: '700' }}>{n}</Text>
                </View>
                <View style={styles.sheetTextBlock}>
                  <Text style={styles.sheetItemLabel}>{n} per page</Text>
                </View>
                {n === pageSize && <Ionicons name="checkmark" size={18} color="#4361EE" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPageSizeOpen(false)}>
              <Text style={styles.sheetCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  // ── Top bar ──
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 11, color: '#64748b', marginTop: 0 },
  addPatientBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#4361EE',
    shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  addPatientLbl: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Header (stable) ──
  headerWrap: { paddingHorizontal: 16, paddingTop: 2 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a' },
  filterBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  filterChipRow: { marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipTxt: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  actionLbl: { fontSize: 12, fontWeight: '600', color: '#475569' },

  // ── List ──
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },

  identity: { flex: 1, gap: 4 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  phone: { fontSize: 12.5, color: '#4361EE', fontWeight: '600' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  metaSpacer: { flex: 1, minWidth: 8 },
  genderPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  genderTxt: { fontSize: 10, fontWeight: '700' },
  churnPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
  },
  churnTxt: { fontSize: 9, fontWeight: '700', color: '#dc2626' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  kebab: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Subtle progress bar shown during page transitions
  progressBarTrack: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: '#E0E7FF', zIndex: 10, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', width: '40%', backgroundColor: '#4361EE',
  },

  // ── Pagination ──
  pagFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pagWrap: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 12,
  },
  pagRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  pagShowing: { fontSize: 13, color: '#475569', flexShrink: 1 },
  pagBold: { fontWeight: '700', color: '#0f172a' },
  pagNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
  },
  pageNumGroup: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center',
  },
  pageBtn: {
    minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  pageBtnLg: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34,
    borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  pageNavTxt: { fontSize: 13, color: '#475569', fontWeight: '600' },
  pageBtnDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  pageBtnActive: { backgroundColor: '#4361EE', borderColor: '#4361EE' },
  pageBtnTxt: { fontSize: 13, color: '#475569', fontWeight: '600' },
  pageBtnTxtActive: { color: '#fff' },
  perPagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  perPageTxt: { fontSize: 12, color: '#0f172a', fontWeight: '600' },

  // ── Filter dropdown ──
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.25)', paddingHorizontal: 16,
  },
  filterMenu: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0', width: 220,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 12,
  },
  filterMenuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  filterMenuItemActive: { backgroundColor: '#EEF2FF' },
  filterMenuTxt: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  filterMenuTxtActive: { color: '#4361EE', fontWeight: '700' },

  // ── Action sheet (View/Edit/Delete + Export picker) ──
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 6,
  },
  sheetHeader: {
    paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },
  sheetName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sheetPhone: { fontSize: 12, color: '#64748b', marginTop: 2 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 8, paddingVertical: 12, borderRadius: 12,
  },
  sheetIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetTextBlock: { flex: 1 },
  sheetItemLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  sheetItemSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  sheetCancel: {
    backgroundColor: '#F8FAFC', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  sheetCancelTxt: { fontSize: 14, fontWeight: '700', color: '#475569' },
});
