import { getPublicBackendUrl } from "@/lib/config/public-env";

export const XSRF_COOKIE_NAME = "XSRF-TOKEN";
export const XSRF_HEADER_NAME = "X-XSRF-TOKEN";

// In-memory cache for cross-origin deployments where document.cookie
// cannot read cookies set on the backend domain.
let cachedToken: string | null = null;
let pendingTokenRequest: Promise<string | null> | null = null;

export function getXsrfTokenFromCookie(): string | null {
  // Return cached token first (always works cross-origin)
  if (cachedToken) {
    return cachedToken;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${XSRF_COOKIE_NAME}=`;
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function clearXsrfToken() {
  cachedToken = null;
}

export async function ensureXsrfToken(): Promise<string | null> {
  const existingToken = getXsrfTokenFromCookie();
  if (existingToken || typeof window === "undefined") {
    return existingToken;
  }

  if (!pendingTokenRequest) {
    pendingTokenRequest = fetch(`${getPublicBackendUrl()}/auth/csrf`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not initialize request security token.");
        }

        // Read token from response body (works cross-origin unlike document.cookie)
        const data = await response.json().catch(() => ({}));
        if (data?.csrfToken) {
          cachedToken = data.csrfToken;
          return cachedToken;
        }

        // Fallback: same-origin — try reading from document.cookie
        const prefix = `${XSRF_COOKIE_NAME}=`;
        const match = document.cookie
          .split("; ")
          .find((c) => c.startsWith(prefix));
        cachedToken = match
          ? decodeURIComponent(match.slice(prefix.length))
          : null;
        return cachedToken;
      })
      .finally(() => {
        pendingTokenRequest = null;
      });
  }

  return pendingTokenRequest;
}

