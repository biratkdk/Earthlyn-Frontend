import axios from 'axios';
import { getAuthToken, setAuthToken, clearAuthToken } from '@/lib/store/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://earthlyn-backend.onrender.com';

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
