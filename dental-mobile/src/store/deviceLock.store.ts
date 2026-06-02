import { create } from 'zustand';
import {
  authenticateWithBiometric,
  clearDeviceLock,
  clearSessionActivityOnly,
  getBiometricCapabilities,
  getLoginHint,
  hasPinConfigured,
  isBiometricUnlockEnabled,
  isInactiveBeyondThreshold,
  saveLoginHint,
  setupPin,
  touchActivity,
  verifyPin,
  resetPinOnly,
  type LoginIdentifierType,
} from '../services/deviceLock.service';

const UNLOCK_GRACE_MS = 2500;

interface DeviceLockState {
  isReady: boolean;
  isLocked: boolean;
  needsSetup: boolean;
  biometricEnabled: boolean;
  biometricLabel: string;
  biometricAvailable: boolean;
  displayName: string | null;
  loginIdentifier: string | null;
  loginIdentifierType: LoginIdentifierType | null;
  pinError: string | null;
  failedAttempts: number;
  unlockedAtMs: number;

  bootstrap: (hasActiveSession?: boolean) => Promise<void>;
  onLoginSuccess: (opts: {
    identifier: string;
    identifierType: LoginIdentifierType;
    displayName: string;
  }) => Promise<void>;
  completeSetup: (pin: string, enableBiometric: boolean) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lockApp: () => void;
  recordActivity: () => Promise<void>;
  checkInactivityAndLock: () => Promise<void>;
  onAppForeground: () => Promise<void>;
  clearAll: () => Promise<void>;
  preparePasswordLogin: () => Promise<void>;
  forgotPin: () => Promise<void>;
}

async function loadBiometricFlags() {
  const [bioEnabled, bioCaps] = await Promise.all([
    isBiometricUnlockEnabled(),
    getBiometricCapabilities(),
  ]);
  return {
    biometricEnabled: bioEnabled && bioCaps.available,
    biometricAvailable: bioCaps.available,
    biometricLabel: bioCaps.label,
  };
}

export const useDeviceLockStore = create<DeviceLockState>((set, get) => ({
  isReady: false,
  isLocked: false,
  needsSetup: false,
  biometricEnabled: false,
  biometricLabel: 'Biometrics',
  biometricAvailable: false,
  displayName: null,
  loginIdentifier: null,
  loginIdentifierType: null,
  pinError: null,
  failedAttempts: 0,
  unlockedAtMs: 0,

  bootstrap: async (hasActiveSession = false) => {
    const [hasPin, hint, bio] = await Promise.all([
      hasPinConfigured(),
      getLoginHint(),
      loadBiometricFlags(),
    ]);

    const shouldLock = hasPin && hasActiveSession;

    set({
      isReady: true,
      needsSetup: !hasPin,
      isLocked: shouldLock,
      ...bio,
      displayName: hint.displayName,
      loginIdentifier: hint.identifier,
      loginIdentifierType: hint.type,
      pinError: null,
      failedAttempts: 0,
    });
  },

  onLoginSuccess: async ({ identifier, identifierType, displayName }) => {
    await saveLoginHint(identifier, identifierType, displayName);
    const hasPin = await hasPinConfigured();
    const bio = await loadBiometricFlags();

    if (!hasPin) {
      set({
        isReady: true,
        displayName,
        loginIdentifier: identifier,
        loginIdentifierType: identifierType,
        needsSetup: true,
        isLocked: false,
        pinError: null,
        failedAttempts: 0,
        unlockedAtMs: 0,
        ...bio,
      });
      return;
    }

    set({
      isReady: true,
      displayName,
      loginIdentifier: identifier,
      loginIdentifierType: identifierType,
      needsSetup: false,
      isLocked: false,
      pinError: null,
      failedAttempts: 0,
      unlockedAtMs: Date.now(),
      ...bio,
    });

    await touchActivity();
  },

  completeSetup: async (pin, enableBiometric) => {
    await setupPin(pin, enableBiometric);
    const bio = await loadBiometricFlags();
    set({
      needsSetup: false,
      isLocked: false,
      ...bio,
      pinError: null,
      failedAttempts: 0,
      unlockedAtMs: Date.now(),
    });
    await touchActivity();
  },

  unlockWithPin: async (pin) => {
    const ok = await verifyPin(pin);
    if (!ok) {
      const attempts = get().failedAttempts + 1;
      set({
        failedAttempts: attempts,
        pinError: attempts >= 5 ? 'Too many attempts. Use password sign-in.' : 'Incorrect PIN',
      });
      return false;
    }
    await touchActivity();
    set({ isLocked: false, pinError: null, failedAttempts: 0, unlockedAtMs: Date.now() });
    return true;
  },

  unlockWithBiometric: async () => {
    const ok = await authenticateWithBiometric('Unlock Smart Dental Desk');
    if (!ok) return false;
    await touchActivity();
    set({ isLocked: false, pinError: null, failedAttempts: 0, unlockedAtMs: Date.now() });
    return true;
  },

  lockApp: () => {
    if (!get().needsSetup) {
      set({ isLocked: true, pinError: null, failedAttempts: 0 });
    }
  },

  recordActivity: async () => {
    if (get().isLocked || get().needsSetup) return;
    await touchActivity();
  },

  checkInactivityAndLock: async () => {
    if (get().needsSetup || !get().isReady) return;
    const hasPin = await hasPinConfigured();
    if (!hasPin) return;
    if (await isInactiveBeyondThreshold()) {
      set({ isLocked: true });
    }
  },

  onAppForeground: async () => {
    if (get().needsSetup) return;
    if (Date.now() - get().unlockedAtMs < UNLOCK_GRACE_MS) return;

    const hasPin = await hasPinConfigured();
    if (!hasPin) {
      set({ needsSetup: true, isLocked: false });
      return;
    }

    const bio = await loadBiometricFlags();
    set({ isLocked: true, ...bio, pinError: null, failedAttempts: 0 });
  },

  clearAll: async () => {
    await clearDeviceLock();
    set({
      isLocked: false,
      needsSetup: false,
      biometricEnabled: false,
      biometricAvailable: false,
      displayName: null,
      loginIdentifier: null,
      loginIdentifierType: null,
      pinError: null,
      failedAttempts: 0,
      unlockedAtMs: 0,
    });
  },

  preparePasswordLogin: async () => {
    await clearSessionActivityOnly();
    set({ isLocked: false, needsSetup: false, pinError: null, failedAttempts: 0 });
  },

  forgotPin: async () => {
    await resetPinOnly();
    set({
      isLocked: false,
      needsSetup: true,
      biometricEnabled: false,
      pinError: null,
      failedAttempts: 0,
    });
  },
}));
