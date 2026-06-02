import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useDeviceLockStore } from '../store/deviceLock.store';
import { useAuthStore } from '../store/auth.store';

/**
 * Locks after 1h idle; re-locks when app returns to foreground (with grace
 * period after PIN/Face ID unlock so the OS dialog does not re-trigger lock).
 */
export default function AppLockProvider() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocked = useDeviceLockStore((s) => s.isLocked);
  const needsSetup = useDeviceLockStore((s) => s.needsSetup);
  const recordActivity = useDeviceLockStore((s) => s.recordActivity);
  const checkInactivityAndLock = useDeviceLockStore((s) => s.checkInactivityAndLock);
  const onAppForeground = useDeviceLockStore((s) => s.onAppForeground);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated || needsSetup) return;

    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        await onAppForeground();
      } else if (next.match(/inactive|background/) && !isLocked) {
        await recordActivity();
      }
    });

    return () => sub.remove();
  }, [isAuthenticated, needsSetup, isLocked, onAppForeground, recordActivity]);

  useEffect(() => {
    if (!isAuthenticated || isLocked || needsSetup) return;
    const interval = setInterval(() => {
      void checkInactivityAndLock();
    }, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isLocked, needsSetup, checkInactivityAndLock]);

  return null;
}
