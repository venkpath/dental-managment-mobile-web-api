import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, type ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as never, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

// Common composed skeletons
export function SkeletonCardRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width={'62%' as `${number}%`} height={14} />
        <Skeleton width={'40%' as `${number}%`} height={11} />
        <Skeleton width={'24%' as `${number}%`} height={11} />
      </View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={'70%' as `${number}%`} height={14} />
      <Skeleton width={'100%' as `${number}%`} height={11} />
      <Skeleton width={'85%' as `${number}%`} height={11} />
      <View style={styles.cardFoot}>
        <Skeleton width={70} height={10} />
        <Skeleton width={50} height={10} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: '#E2E8F0' },
  row: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  cardFoot: { flexDirection: 'row', gap: 12, marginTop: 4 },
});
