/**
 * Device-only app lock. PIN is hashed locally; biometrics use the OS APIs only.
 * Nothing is sent to Smart Dental Desk servers.
 */
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  lockStorageClearAll,
  lockStorageDelete,
  lockStorageGet,
  lockStorageSet,
} from './deviceLock.storage';

export const INACTIVITY_LOCK_MS = 60 * 60 * 1000; // 1 hour
export const PIN_LENGTH = 4;

const KEYS = {
  pinHash: 'dental-lock-pin-hash',
  pinSalt: 'dental-lock-pin-salt',
  biometricEnabled: 'dental-lock-biometric',
  lastActivity: 'dental-lock-last-activity',
  loginIdentifier: 'dental-lock-login-id',
  loginIdentifierType: 'dental-lock-login-id-type',
  userDisplayName: 'dental-lock-display-name',
} as const;

export type LoginIdentifierType = 'email' | 'phone';

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPinConfigured(): Promise<boolean> {
  const hash = await lockStorageGet(KEYS.pinHash);
  return !!hash;
}

export async function getLastActivityMs(): Promise<number | null> {
  const raw = await lockStorageGet(KEYS.lastActivity);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function touchActivity(): Promise<void> {
  await lockStorageSet(KEYS.lastActivity, String(Date.now()));
}

export async function isInactiveBeyondThreshold(): Promise<boolean> {
  const last = await getLastActivityMs();
  if (last == null) return false;
  return Date.now() - last >= INACTIVITY_LOCK_MS;
}

export async function saveLoginHint(
  identifier: string,
  type: LoginIdentifierType,
  displayName: string,
): Promise<void> {
  await lockStorageSet(KEYS.loginIdentifier, identifier);
  await lockStorageSet(KEYS.loginIdentifierType, type);
  await lockStorageSet(KEYS.userDisplayName, displayName);
}

export async function getLoginHint(): Promise<{
  identifier: string | null;
  type: LoginIdentifierType | null;
  displayName: string | null;
}> {
  const [identifier, type, displayName] = await Promise.all([
    lockStorageGet(KEYS.loginIdentifier),
    lockStorageGet(KEYS.loginIdentifierType),
    lockStorageGet(KEYS.userDisplayName),
  ]);
  return {
    identifier,
    type: type === 'email' || type === 'phone' ? type : null,
    displayName,
  };
}

export async function setupPin(pin: string, enableBiometric: boolean): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  const salt = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`,
  );
  const hash = await hashPin(pin, salt);
  await lockStorageSet(KEYS.pinSalt, salt);
  await lockStorageSet(KEYS.pinHash, hash);
  await lockStorageSet(KEYS.biometricEnabled, enableBiometric ? '1' : '0');
  await touchActivity();
  if (!(await hasPinConfigured())) {
    throw new Error('Could not save PIN on this device. Try again or reinstall the app.');
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [hash, salt] = await Promise.all([
    lockStorageGet(KEYS.pinHash),
    lockStorageGet(KEYS.pinSalt),
  ]);
  if (!hash || !salt) return false;
  const attempt = await hashPin(pin, salt);
  return attempt === hash;
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  const flag = await lockStorageGet(KEYS.biometricEnabled);
  return flag === '1';
}

export async function getBiometricCapabilities(): Promise<{
  available: boolean;
  enrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
  label: string;
}> {
  const [hasHardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  const available = hasHardware && enrolled;
  let label = 'Biometrics';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    label = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? 'Face or fingerprint'
      : 'Face ID';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    label = 'Fingerprint';
  } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    label = 'Iris unlock';
  }
  return { available, enrolled, types, label };
}

export async function authenticateWithBiometric(prompt: string): Promise<boolean> {
  const enabled = await isBiometricUnlockEnabled();
  if (!enabled) return false;
  const { available } = await getBiometricCapabilities();
  if (!available) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'Use PIN',
    disableDeviceFallback: false,
    fallbackLabel: 'Use PIN',
  });
  return result.success;
}

export async function clearDeviceLock(): Promise<void> {
  await lockStorageClearAll(Object.values(KEYS));
}

export async function clearSessionActivityOnly(): Promise<void> {
  await lockStorageDelete(KEYS.lastActivity);
}

export async function resetPinOnly(): Promise<void> {
  await lockStorageClearAll([
    KEYS.pinHash,
    KEYS.pinSalt,
    KEYS.biometricEnabled,
    KEYS.lastActivity,
  ]);
}
