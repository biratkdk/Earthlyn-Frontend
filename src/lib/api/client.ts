import axios from 'axios';
import { clearAuthToken } from '@/lib/store/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  let token = null;
  
  if (typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token || null;
      }
    } catch (e) {
      console.error('Failed to parse auth storage:', e);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    console.error("[API] Error:", error?.status, error?.data); return Promise.reject(error);
  }
);

export default apiClient;

