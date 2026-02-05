import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>()(persist(
  (set) => ({
    user: null,
    token: null,
    isLoading: false,

    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),

    login: async (email, password) => {
      set({ isLoading: true });
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
          set({ user: data.user, token: data.access_token });
        } else {
          throw new Error(data.message || "Login failed");
        }
      } finally {
        set({ isLoading: false });
      }
    },

    register: async (email, password, name, role) => {
      set({ isLoading: true });
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, role }),
        });
        const data = await response.json();
        if (response.ok) {
          set({ user: data.user, token: data.access_token });
        } else {
          throw new Error(data.message || "Registration failed");
        }
      } finally {
        set({ isLoading: false });
      }
    },

    logout: () => set({ user: null, token: null }),
  }),
  {
    name: "auth-storage",
  }
));

// Helper functions
export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  const store = useAuthStore.getState();
  return store.token;
};

export const setAuthToken = (token: string) => {
  useAuthStore.setState({ token });
};

export const clearAuthToken = () => {
  useAuthStore.setState({ user: null, token: null });
};
