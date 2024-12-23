import type { NextFunction, Request, Response } from "express";
import {
  AUTH_SESSION_COOKIE,
  XSRF_TOKEN_COOKIE,
  XSRF_TOKEN_HEADER,
  getCookieValue,
} from "../../auth/auth-cookie";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set(["/payments/webhook"]);
const AUTH_STATE_CHANGING_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/resend-verification",
  "/auth/verify-email",
]);

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const hasSession = Boolean(
    getCookieValue(req.headers.cookie, AUTH_SESSION_COOKIE),
  );
  const requiresToken =
    hasSession || AUTH_STATE_CHANGING_PATHS.has(req.path);

  if (!requiresToken) {
    return next();
  }

  const cookieToken = getCookieValue(req.headers.cookie, XSRF_TOKEN_COOKIE);
  const headerToken = req.get(XSRF_TOKEN_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  return next();
}
// CSRF middleware
