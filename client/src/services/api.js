import axios from 'axios';
import { API_URL } from '../constants';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hous_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary — manual Content-Type breaks file uploads.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }
  return config;
});

let refreshPromise = null;
let onAuthRefresh = null;
let onAuthFailure = null;

async function performTokenRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  const { data } = await refreshPromise;
  const accessToken = data.data.accessToken;
  const user = data.data.user;
  localStorage.setItem('hous_access_token', accessToken);
  localStorage.setItem('hous_user', JSON.stringify(user));
  if (onAuthRefresh) onAuthRefresh({ accessToken, user });
  return { accessToken, user };
}

/** Refresh access token using the httpOnly refresh cookie. */
export async function refreshSession() {
  return performTokenRefresh();
}

/** Wire Redux callbacks after store is created to avoid circular imports. */
export function bindAuthHandlers({ onRefresh, onFailure }) {
  onAuthRefresh = onRefresh;
  onAuthFailure = onFailure;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url || '';
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/refresh') &&
      !url.includes('/auth/register')
    ) {
      original._retry = true;
      try {
        const { accessToken } = await performTokenRefresh();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        localStorage.removeItem('hous_access_token');
        localStorage.removeItem('hous_user');
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
