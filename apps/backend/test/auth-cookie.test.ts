import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_SESSION_COOKIE,
  createXsrfToken,
  getCookieValue,
} from "../src/auth/auth-cookie";

test("getCookieValue extracts a named cookie", () => {
  const value = getCookieValue(
    `theme=light; ${AUTH_SESSION_COOKIE}=abc123; other=value`,
    AUTH_SESSION_COOKIE,
  );

  assert.equal(value, "abc123");
});

test("getCookieValue decodes cookie values", () => {
  const value = getCookieValue(
    `${AUTH_SESSION_COOKIE}=token%20with%20spaces`,
    AUTH_SESSION_COOKIE,
  );

  assert.equal(value, "token with spaces");
});

test("getCookieValue returns null when the cookie is missing", () => {
  assert.equal(getCookieValue("theme=light", AUTH_SESSION_COOKIE), null);
});

test("createXsrfToken returns unique URL-safe tokens", () => {
  const first = createXsrfToken();
  const second = createXsrfToken();

  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(first, second);
});
