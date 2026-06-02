import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const FALLBACK_PREFIX = '@dental-lock-fallback:';

let useFallback: boolean | null = null;

async function preferFallback(): Promise<boolean> {
  if (useFallback !== null) return useFallback;
  try {
    useFallback = !(await SecureStore.isAvailableAsync());
  } catch {
    useFallback = true;
  }
  return useFallback;
}

export async function lockStorageSet(key: string, value: string): Promise<void> {
  if (await preferFallback()) {
    await AsyncStorage.setItem(FALLBACK_PREFIX + key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    useFallback = true;
    await AsyncStorage.setItem(FALLBACK_PREFIX + key, value);
  }
}

export async function lockStorageGet(key: string): Promise<string | null> {
  if (await preferFallback()) {
    return AsyncStorage.getItem(FALLBACK_PREFIX + key);
  }
  try {
    const v = await SecureStore.getItemAsync(key);
    if (v != null) return v;
  } catch {
    useFallback = true;
  }
  return AsyncStorage.getItem(FALLBACK_PREFIX + key);
}

export async function lockStorageDelete(key: string): Promise<void> {
  await AsyncStorage.removeItem(FALLBACK_PREFIX + key).catch(() => undefined);
  try {
    if (!(await preferFallback())) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    /* ignore */
  }
}

export function lockStorageUsesFallback(): boolean {
  return useFallback === true;
}

/** Wipe secure-store and any fallback AsyncStorage copies. */
export async function lockStorageClearAll(keyIds: readonly string[]): Promise<void> {
  await Promise.all(keyIds.map((key) => lockStorageDelete(key)));
  try {
    const all = await AsyncStorage.getAllKeys();
    const extra = all.filter((k) => k.startsWith(FALLBACK_PREFIX));
    if (extra.length > 0) await AsyncStorage.multiRemove(extra);
  } catch {
    /* ignore */
  }
}
