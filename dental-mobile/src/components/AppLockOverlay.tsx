import React from 'react';
import { StyleSheet, View } from 'react-native';
import LockScreen from '../screens/auth/LockScreen';
import SetupLockScreen from '../screens/auth/SetupLockScreen';
import { useDeviceLockStore } from '../store/deviceLock.store';

/**
 * Full-screen overlay so lock UI is always above tabs (navigator swap was
 * unreliable and could hide the PIN pad).
 */
export default function AppLockOverlay() {
  const needsSetup = useDeviceLockStore((s) => s.needsSetup);
  const isLocked = useDeviceLockStore((s) => s.isLocked);

  if (needsSetup) {
    return (
      <View style={s.layer}>
        <SetupLockScreen />
      </View>
    );
  }

  if (!isLocked) return null;

  return (
    <View style={s.layer}>
      <LockScreen />
    </View>
  );
}

const s = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#fff',
  },
});
