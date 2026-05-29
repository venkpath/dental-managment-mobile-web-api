import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Shared design tokens — kept identical to the billing/patient list screens
// so every paginated list looks the same across the app.
const C = {
  indigo: '#4361EE',
  indigoLight: '#EEF2FF',
  bg: '#F8FAFC',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#475569',
  textMuted: '#94a3b8',
  border: '#E2E8F0',
  divider: '#f1f5f9',
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

/** Thin indeterminate progress bar shown during page transitions. */
export function IndeterminateBar() {
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
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
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

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPickPageSize: () => void;
}

export const PaginationBar = React.memo(function PaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPickPageSize,
}: PaginationBarProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const maxShow = 3;
  let start = Math.max(1, Math.min(page - 1, totalPages - maxShow + 1));
  if (start < 1) start = 1;
  const pageNums: number[] = [];
  for (let i = start; i < start + maxShow && i <= totalPages; i++) pageNums.push(i);

  const prevOff = page <= 1;
  const nextOff = page >= totalPages;

  return (
    <View style={pg.wrap}>
      <View style={pg.row1}>
        <Text style={pg.showing}>
          Showing <Text style={pg.bold}>{from}</Text>–<Text style={pg.bold}>{to}</Text>
          {' '}of <Text style={pg.bold}>{total}</Text>
        </Text>
        <TouchableOpacity style={pg.perPage} onPress={onPickPageSize} activeOpacity={0.7}>
          <Text style={pg.perPageTxt}>{pageSize} / page</Text>
          <Ionicons name="chevron-down" size={12} color={C.textSub} />
        </TouchableOpacity>
      </View>
      <View style={pg.row2}>
        <TouchableOpacity
          style={[pg.navBtn, prevOff && pg.navBtnOff]}
          disabled={prevOff}
          onPress={() => onPageChange(page - 1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={14} color={prevOff ? C.textMuted : C.textSub} />
          <Text style={[pg.navTxt, prevOff && pg.navTxtOff]}>Prev</Text>
        </TouchableOpacity>
        <View style={pg.nums}>
          {pageNums.map((n) => (
            <TouchableOpacity
              key={n}
              style={[pg.numBtn, n === page && pg.numBtnActive]}
              onPress={() => onPageChange(n)}
              activeOpacity={0.7}
            >
              <Text style={[pg.numTxt, n === page && pg.numTxtActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[pg.navBtn, nextOff && pg.navBtnOff]}
          disabled={nextOff}
          onPress={() => onPageChange(page + 1)}
          activeOpacity={0.7}
        >
          <Text style={[pg.navTxt, nextOff && pg.navTxtOff]}>Next</Text>
          <Ionicons name="chevron-forward" size={14} color={nextOff ? C.textMuted : C.textSub} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

interface PageSizeSheetProps {
  visible: boolean;
  pageSize: number;
  noun?: string;
  onPick: (n: number) => void;
  onClose: () => void;
}

export function PageSizeSheet({ visible, pageSize, noun = 'items', onPick, onClose }: PageSizeSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sh.backdrop} onPress={onClose}>
        <Pressable style={sh.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={sh.header}>
            <Text style={sh.title}>Items per page</Text>
            <Text style={sh.sub}>Choose how many {noun} to show</Text>
          </View>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <TouchableOpacity key={n} style={sh.item} onPress={() => onPick(n)} activeOpacity={0.7}>
              <View style={sh.iconBox}>
                <Text style={sh.iconNum}>{n}</Text>
              </View>
              <Text style={sh.itemLabel}>{n} per page</Text>
              {n === pageSize && <Ionicons name="checkmark" size={18} color={C.indigo} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={sh.cancel} onPress={onClose}>
            <Text style={sh.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.indigoLight,
    zIndex: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', width: '40%', backgroundColor: C.indigo },
});

const pg = StyleSheet.create({
  wrap: { backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border, gap: 8 },
  row1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  showing: { fontSize: 13, color: C.textSub, flexShrink: 1 },
  bold: { fontWeight: '700', color: C.text },
  perPage: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  perPageTxt: { fontSize: 12, color: C.text, fontWeight: '600' },
  row2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  navBtnOff: { backgroundColor: C.bg, borderColor: C.divider },
  navTxt: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  navTxtOff: { color: C.textMuted },
  nums: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  numBtn: { minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  numBtnActive: { backgroundColor: C.indigo, borderColor: C.indigo },
  numTxt: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  numTxtActive: { color: '#fff' },
});

const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 6 },
  header: { paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  sub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.indigoLight, alignItems: 'center', justifyContent: 'center' },
  iconNum: { color: C.indigo, fontSize: 14, fontWeight: '700' },
  itemLabel: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
  cancel: { backgroundColor: C.bg, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
});
