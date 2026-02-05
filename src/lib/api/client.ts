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
    config.headers.Authorization = Bearer ${token};
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Methods
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
};

export const productsAPI = {
  getAll: (filters) => apiClient.get('/products', { params: filters }),
  getById: (id) => apiClient.get(/products/${id}),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.patch(/products/${id}), data),
  delete: (id) => apiClient.delete(/products/${id}),
};

export const sellersAPI = {
  getAll: () => apiClient.get('/sellers'),
  getById: (id) => apiClient.get(/sellers/${id}),
  createListing: (data) => apiClient.post('/sellers', data),
};

export const buyersAPI = {
  getAll: () => apiClient.get('/buyers'),
  getProfile: () => apiClient.get('/buyers/profile'),
};

export const ordersAPI = {
  getAll: () => apiClient.get('/orders'),
  getById: (id) => apiClient.get(/orders/${id}),
  create: (data) => apiClient.post('/orders', data),
  update: (id, data) => apiClient.patch(/orders/${id}), data),
};

export const adminAPI = {
  getStats: () => apiClient.get('/admin/stats'),
  getUsers: () => apiClient.get('/admin/users'),
  approveSeller: (id) => apiClient.post(/admin/sellers/${id})/approve'),
};
