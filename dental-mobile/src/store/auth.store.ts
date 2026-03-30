import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthState, User } from '../types';

const AUTH_KEY = 'dental-auth';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  clinicId: null,
  branchId: null,
  isAuthenticated: false,

  setClinicId: (clinicId: string) => set({ clinicId }),

  login: async (token: string, user: User, clinicId: string, branchId?: string) => {
    const data = { token, user, clinicId, branchId: branchId || null };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
    set({ token, user, clinicId, branchId: branchId || null, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    set({ token: null, user: null, clinicId: null, branchId: null, isAuthenticated: false });
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
      user: data.user,
      clinicId: data.clinicId,
      branchId: data.branchId,
      isAuthenticated: true,
    });
    return true;
  } catch {
    return false;
  }
};
