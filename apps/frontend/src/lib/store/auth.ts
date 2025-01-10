import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPublicBackendUrl } from "@/lib/config/public-env";
import {
  ensureXsrfToken,
  getXsrfTokenFromCookie,
  XSRF_HEADER_NAME,
} from "@/lib/api/csrf";
import { disconnectMessagesSocket } from "@/lib/socket/messages-socket";

const BACKEND_URL = getPublicBackendUrl();

type AuthRole = "ADMIN" | "SELLER" | "BUYER" | "CUSTOMER_SERVICE";
const PROTECTED_ROUTES = [
  "/account",
  "/checkout",
  "/dashboard",
  "/disputes",
  "/messages",
  "/notifications",
  "/orders",
  "/recommendations",
  "/referrals",
  "/rewards",
  "/seller/kyc",
  "/subscription",
];
const AUTH_ROLES = new Set<AuthRole>([
  "ADMIN",
  "SELLER",
  "BUYER",
  "CUSTOMER_SERVICE",
]);

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  emailVerifiedAt?: string | null;
}

interface RegisterResult {
  requiresEmailVerification: boolean;
  email: string;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: AuthRole | string,
  ) => Promise<RegisterResult>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  setHydrated: (hydrated: boolean) => void;
}

async function parseAuthResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Authentication failed");
  }

  return data;
}

function normalizeAuthUser(
  user: Partial<AuthUser> | null | undefined,
): AuthUser {
  if (
    !user ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.name !== "string" ||
    !AUTH_ROLES.has(user.role as AuthRole)
  ) {
    throw new Error("Invalid auth user response");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AuthRole,
    emailVerifiedAt:
      typeof user.emailVerifiedAt === "string" || user.emailVerifiedAt === null
        ? user.emailVerifiedAt
        : undefined,
  };
}

function getAuthUserPayload(data: unknown) {
  if (data && typeof data === "object" && "user" in data) {
    return (data as { user?: Partial<AuthUser> | null }).user;
  }

  return data as Partial<AuthUser> | null | undefined;
}

export function isProtectedPath(pathname: string) {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function redirectToLoginIfProtected() {
  if (typeof window === "undefined") return;

  const { pathname, search } = window.location;
  if (!isProtectedPath(pathname)) return;

  const next = `${pathname}${search}`;
  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set("next", next);
  window.location.assign(loginUrl.toString());
}

function clearPersistedAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("auth-storage");
}

async function jsonHeadersWithXsrf() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const xsrfToken = getXsrfTokenFromCookie() || (await ensureXsrfToken());

  if (xsrfToken) {
    headers[XSRF_HEADER_NAME] = xsrfToken;
  }

  return headers;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isHydrated: false,

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: "POST",
            headers: await jsonHeadersWithXsrf(),
            credentials: "include",
            body: JSON.stringify({ email, password }),
          });
          const data = await parseAuthResponse(response);

          set({
            user: normalizeAuthUser(data.user),
            isHydrated: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, name, role) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${BACKEND_URL}/auth/register`, {
            method: "POST",
            headers: await jsonHeadersWithXsrf(),
            credentials: "include",
            body: JSON.stringify({
              email,
              password,
              name,
              role: role.toString().trim().toUpperCase(),
            }),
          });
          const data = await parseAuthResponse(response);
          const pendingEmail =
            typeof data.user?.email === "string" ? data.user.email : email;

          if (data.requiresEmailVerification) {
            set({
              user: null,
              isHydrated: true,
            });
            return {
              requiresEmailVerification: true,
              email: pendingEmail,
            };
          }

          const registeredUser = normalizeAuthUser(data.user);

          set({
            user: registeredUser,
            isHydrated: true,
          });
          return {
            requiresEmailVerification: false,
            email: registeredUser.email,
          };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        void (async () => {
          const xsrfToken = getXsrfTokenFromCookie() || (await ensureXsrfToken());
          await fetch(`${BACKEND_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
            headers: xsrfToken ? { [XSRF_HEADER_NAME]: xsrfToken } : undefined,
          });
        })().catch(() => undefined);
        disconnectMessagesSocket();
        clearPersistedAuth();
        set({ user: null, isHydrated: true });
      },

      refreshSession: async () => {
        set((state) => ({
          isLoading: true,
          isHydrated: Boolean(state.user),
        }));
        try {
          const response = await fetch(`${BACKEND_URL}/auth/validate`, {
            credentials: "include",
          });
          const data = await parseAuthResponse(response);

          set({
            user: normalizeAuthUser(getAuthUserPayload(data)),
            isHydrated: true,
          });
        } catch {
          set({ user: null, isHydrated: true });
          redirectToLoginIfProtected();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          state.isLoading = false;
        }
      },
    },
  ),
);

export const clearAuthToken = () => {
  clearPersistedAuth();
  useAuthStore.setState({ user: null, isHydrated: true });
  redirectToLoginIfProtected();
};

