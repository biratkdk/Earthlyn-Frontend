import { create } from "zustand";
import { persist } from "zustand/middleware";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

type AuthRole = "ADMIN" | "SELLER" | "BUYER" | "CUSTOMER_SERVICE";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: AuthRole | string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(persist(
  (set) => ({
    user: null,
    token: null,
    isLoading: false,
    isHydrated: false,

    setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),

    login: async (email, password) => {
      set({ isLoading: true });
      try {
        console.log("[AUTH] Starting login for:", email);
        const response = await fetch(`${BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        console.log("[AUTH] Login response:", data);
        console.log("[AUTH] Response status:", response.ok);
        
        if (response.ok) {
          console.log("[AUTH] Setting token:", data.accessToken ? "EXISTS" : "MISSING");
          console.log("[AUTH] Token preview:", data.accessToken ? data.accessToken.substring(0, 20) : "null");
          
          set({ user: data.user, token: data.accessToken, isHydrated: true });
          
          setTimeout(() => {
            const stored = localStorage.getItem("auth-storage");
            console.log("[AUTH] After set - localStorage check:");
            console.log("[AUTH] Stored data exists:", !!stored);
            if (stored) {
              const parsed = JSON.parse(stored);
              console.log("[AUTH] Stored token exists:", !!parsed.state?.token);
              console.log("[AUTH] Stored token preview:", parsed.state?.token?.substring(0, 20));
            }
          }, 100);
        } else {
          throw new Error(data.message || "Login failed");
        }
      } catch (err: any) {
        console.error("[AUTH] Login error:", err.message);
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    register: async (email, password, name, role) => {
      set({ isLoading: true });
      try {
        const normalizedRole = role.toString().trim().toUpperCase();
        const response = await fetch(`${BACKEND_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, role: normalizedRole }),
        });
        const data = await response.json();
        if (response.ok) {
          set({ user: data.user, token: data.accessToken, isHydrated: true });
        } else {
          throw new Error(data.message || "Registration failed");
        }
      } finally {
        set({ isLoading: false });
      }
    },

    logout: () => set({ user: null, token: null, isHydrated: false }),
  }),
  {
    name: "auth-storage",
    onRehydrateStorage: () => (state) => {
      console.log("[AUTH] Rehydrating - state exists:", !!state);
      if (state) {
        console.log("[AUTH] Token restored from storage:", !!state.token);
        state.isHydrated = true;
      }
    },
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
  useAuthStore.setState({ user: null, token: null, isHydrated: false });
};

