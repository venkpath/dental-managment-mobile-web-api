import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '../services/user.service';
import { useAuthStore } from '../store/auth.store';

const AUTH_KEY = 'dental-auth';

/** Load profile photo (signed URL) for the logged-in user into auth store. */
export async function refreshUserProfile(): Promise<void> {
  const state = useAuthStore.getState();
  const { user, token } = state;
  if (!token || !user?.id) return;
  try {
    const full = await userService.get(user.id);
    const updatedUser = {
      ...user,
      profile_photo_url: full.profile_photo_url ?? null,
    };
    useAuthStore.setState({ user: updatedUser });
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      await AsyncStorage.setItem(
        AUTH_KEY,
        JSON.stringify({ ...data, user: updatedUser }),
      );
    }
  } catch {
    // Non-fatal
  }
}