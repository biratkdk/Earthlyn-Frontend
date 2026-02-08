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
        console.log("[AUTH] Response status:", response.ok);
        console.log("[AUTH] accessToken from backend:", data.accessToken ? "EXISTS (length: " + data.accessToken.length + ")" : "MISSING");
        
        if (response.ok) {
          console.log("[AUTH] Setting state with user and token");
          set({ user: data.user, token: data.accessToken, isHydrated: true });
          
          // MANUAL localStorage save as backup
          if (typeof window !== "undefined") {
            const toStore = {
              state: {
                user: data.user,
                token: data.accessToken,
                isHydrated: true,
              },
              version: 0,
            };
            console.log("[AUTH] Manually saving to localStorage...");
            localStorage.setItem("auth-storage", JSON.stringify(toStore));
            console.log("[AUTH] Saved to localStorage");
            
            // Verify it was saved
            setTimeout(() => {
              const stored = localStorage.getItem("auth-storage");
              const parsed = stored ? JSON.parse(stored) : null;
              console.log("[AUTH] Verification - Token in localStorage:", !!parsed?.state?.token);
            }, 50);
          }
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
        console.log("[AUTH] Starting registration for:", email);
        const normalizedRole = role.toString().trim().toUpperCase();
        const response = await fetch(`${BACKEND_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, role: normalizedRole }),
        });
        const data = await response.json();
        console.log("[AUTH] Register response status:", response.ok);
        
        if (response.ok) {
          console.log("[AUTH] Setting state after registration");
          set({ user: data.user, token: data.accessToken, isHydrated: true });
          
          // MANUAL localStorage save as backup
          if (typeof window !== "undefined") {
            const toStore = {
              state: {
                user: data.user,
                token: data.accessToken,
                isHydrated: true,
              },
              version: 0,
            };
            console.log("[AUTH] Manually saving to localStorage...");
            localStorage.setItem("auth-storage", JSON.stringify(toStore));
            console.log("[AUTH] Saved to localStorage after registration");
          }
        } else {
          throw new Error(data.message || "Registration failed");
        }
      } catch (err: any) {
        console.error("[AUTH] Register error:", err.message);
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    logout: () => {
      set({ user: null, token: null, isHydrated: false });
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-storage");
      }
    },
  }),
  {
    name: "auth-storage",
    onRehydrateStorage: () => (state) => {
      console.log("[AUTH] Rehydrating from storage - state exists:", !!state);
      if (state) {
        console.log("[AUTH] Token restored from storage:", !!state.token);
        state.isHydrated = true;
      } else {
        console.log("[AUTH] No stored state found - starting fresh");
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
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth-storage");
  }
};
