import { randomBytes } from "crypto";

export const AUTH_SESSION_COOKIE = "earthlyn-session";
export const AUTH_ROLE_COOKIE = "earthlyn-session-role";
export const XSRF_TOKEN_COOKIE = "XSRF-TOKEN";
export const XSRF_TOKEN_HEADER = "x-xsrf-token";

export function createXsrfToken() {
  return randomBytes(32).toString("base64url");
}

export function getCookieValue(
  cookieHeader: string | string[] | undefined,
  name: string,
) {
  const rawCookie = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader;
  if (!rawCookie) {
    return null;
  }

  const cookies = rawCookie.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(prefix.length));
}
