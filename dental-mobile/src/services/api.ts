import axios from 'axios';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/auth.store';

let isShowingSessionExpiredAlert = false;

const BASE_URL = 'https://api.smartdentaldesk.com/api/v1';

export const API_BASE_URL = BASE_URL;

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
  (error) => {
    const reqUrl: string = error.config?.url ?? '';
    const isAuthEndpoint = reqUrl.includes('/auth/lookup') || reqUrl.includes('/auth/login');

    if (error.response?.status === 401 && !isAuthEndpoint) {
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
