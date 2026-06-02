import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthState, User } from '../types';
import { useDeviceLockStore } from './deviceLock.store';

const AUTH_KEY = 'dental-auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  clinicId: null,
  clinicName: null,
  clinicLogoUrl: null,
  branchId: null,
  isAuthenticated: false,

  setClinicId: (clinicId: string) => set({ clinicId }),

  patchUser: (partial: Partial<User>) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, ...partial } });
  },

  login: async (token: string, user: User, clinicId: string, branchId?: string, clinicName?: string, refreshToken?: string) => {
    const data = {
      token,
      refreshToken: refreshToken || null,
      user,
      clinicId,
      branchId: branchId || null,
      clinicName: clinicName || null,
      clinicLogoUrl: null as string | null,
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
    set({
      token,
      refreshToken: refreshToken || null,
      user,
      clinicId,
      branchId: branchId || null,
      clinicName: clinicName || null,
      clinicLogoUrl: null,
      isAuthenticated: true,
    });
  },

  setTokens: async (token: string, refreshToken?: string | null) => {
    const next = {
      token,
      refreshToken: refreshToken !== undefined ? refreshToken : get().refreshToken,
    };
    set(next);
    try {
      const raw = await AsyncStorage.getItem(AUTH_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ ...data, ...next }));
      }
    } catch {
      // Non-fatal: in-memory tokens are still updated for the current session
    }
  },

  updateBranding: async (clinicName: string, clinicLogoUrl: string | null) => {
    const { token, refreshToken, user, clinicId, branchId } = get();
    if (!token) return;
    const data = {
      token,
      refreshToken,
      user,
      clinicId,
      branchId,
      clinicName,
      clinicLogoUrl,
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
    set({ clinicName, clinicLogoUrl });
  },

  logout: async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    set({
      token: null,
      refreshToken: null,
      user: null,
      clinicId: null,
      clinicName: null,
      clinicLogoUrl: null,
      branchId: null,
      isAuthenticated: false,
    });
  },

  logoutAndForgetDevice: async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    await useDeviceLockStore.getState().clearAll();
    set({
      token: null,
      refreshToken: null,
      user: null,
      clinicId: null,
      clinicName: null,
      clinicLogoUrl: null,
      branchId: null,
      isAuthenticated: false,
    });
  },
}));

export const loadAuthFromStorage = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.token) return false;
    useAuthStore.setState({
      token: data.token,
      refreshToken: data.refreshToken ?? null,
      user: data.user,
      clinicId: data.clinicId,
      clinicName: data.clinicName || null,
      clinicLogoUrl: data.clinicLogoUrl ?? null,
      branchId: data.branchId,
      isAuthenticated: true,
    });
    return true;
  } catch {
    return false;
  }
};
