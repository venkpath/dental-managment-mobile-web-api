import axios from 'axios';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/auth.store';

let isShowingSessionExpiredAlert = false;

const BASE_URL = 'https://api.smartdentaldesk.com/api/v1';

export const API_BASE_URL = BASE_URL;

/**
 * Exchange the stored refresh token for a fresh access token. Uses a bare axios
 * call (not the `api` instance) so it never recurses through this interceptor.
 * Single-flight: concurrent 401s share one in-flight refresh.
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
    );
    // Backend wraps success responses as { success, data }
    const data = res.data?.data ?? res.data;
    const newAccess: string | undefined = data?.access_token;
    if (!newAccess) return null;
    await useAuthStore.getState().setTokens(newAccess, data?.refresh_token ?? refreshToken);
    return newAccess;
  } catch {
    return null;
  }
}

function getFreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken();
    void refreshPromise.finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const { token, clinicId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (clinicId) config.headers['x-clinic-id'] = clinicId;
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.success === true) {
      if (response.data.meta) {
        // Backend uses snake_case (total_pages); normalise to camelCase for the app
        const raw = response.data.meta;
        const meta = {
          total: raw.total,
          page: raw.page,
          limit: raw.limit,
          totalPages: raw.totalPages ?? raw.total_pages ?? 0,
        };
        return { ...response, data: { data: response.data.data, meta } };
      }
      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error) => {
    const reqUrl: string = error.config?.url ?? '';
    const isAuthEndpoint =
      reqUrl.includes('/auth/lookup') ||
      reqUrl.includes('/auth/login') ||
      reqUrl.includes('/auth/refresh');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      const original = error.config;
      // Try a silent token refresh once before treating the session as dead.
      if (original && !original._retry) {
        original._retry = true;
        const newToken = await getFreshAccessToken();
        if (newToken) {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      }
      // Refresh unavailable or failed → session truly expired.
      if (!isShowingSessionExpiredAlert) {
        isShowingSessionExpiredAlert = true;
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{
            text: 'OK',
            onPress: () => {
              isShowingSessionExpiredAlert = false;
              useAuthStore.getState().logout();
            },
          }]
        );
      }
    }
    const status = error.response?.status as number | undefined;
    const apiError = error.response?.data;
    const headers = error.response?.headers ?? {};

    if (status === 429) {
      const retryHeader =
        headers['retry-after'] ??
        headers['retry-after-strict'] ??
        headers['x-ratelimit-reset'];
      const retrySec = retryHeader != null ? parseInt(String(retryHeader), 10) : NaN;
      let msg =
        apiError?.error?.message ||
        'Too many requests. Please wait a moment and try again.';
      if (!Number.isNaN(retrySec) && retrySec > 0) {
        msg = `Too many requests. Try again in ${retrySec} second${retrySec === 1 ? '' : 's'}.`;
      }
      return Promise.reject(new Error(msg));
    }

    if (apiError?.error) {
      const details = apiError.error.details;
      const msg = apiError.error.message || 'Something went wrong';
      if (msg === 'Invalid request payload' && Array.isArray(details) && details.length > 0) {
        return Promise.reject(new Error(String(details[0])));
      }
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(error);
  }
);

export default api;
