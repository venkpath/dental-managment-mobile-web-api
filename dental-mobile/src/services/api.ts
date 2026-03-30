import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

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
        return { ...response, data: { data: response.data.data, meta: response.data.meta } };
      }
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    const apiError = error.response?.data;
    if (apiError?.error) {
      const msg = apiError.error.message || 'Something went wrong';
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(error);
  }
);

export default api;
