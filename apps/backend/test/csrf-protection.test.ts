import test from "node:test";
import assert from "node:assert/strict";
import { csrfProtection } from "../src/common/middleware/csrf-protection";
import {
  AUTH_SESSION_COOKIE,
  XSRF_TOKEN_COOKIE,
  XSRF_TOKEN_HEADER,
} from "../src/auth/auth-cookie";

function runCsrfMiddleware({
  method = "POST",
  path = "/orders/order-1/cancel",
  cookie = "",
  header,
}: {
  method?: string;
  path?: string;
  cookie?: string;
  header?: string;
}) {
  let nextCalled = false;
  const responseState = {
    statusCode: 200,
    body: null as unknown,
  };
  const req = {
    method,
    path,
    headers: { cookie },
    get(name: string) {
      return name.toLowerCase() === XSRF_TOKEN_HEADER ? header : undefined;
    },
  };
  const res = {
    status(code: number) {
      responseState.statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseState.body = body;
      return this;
    },
  };

  csrfProtection(req as any, res as any, () => {
    nextCalled = true;
  });

  return { nextCalled, responseState };
}

test("csrfProtection allows safe methods without a token", () => {
  const result = runCsrfMiddleware({
    method: "GET",
    cookie: `${AUTH_SESSION_COOKIE}=session-token`,
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.responseState.statusCode, 200);
});

test("csrfProtection rejects auth mutations without matching token", () => {
  const result = runCsrfMiddleware({
    path: "/auth/login",
    cookie: `${XSRF_TOKEN_COOKIE}=csrf-1`,
    header: "csrf-2",
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.responseState.statusCode, 403);
  assert.deepEqual(result.responseState.body, { message: "Invalid CSRF token" });
});

test("csrfProtection allows auth mutations with matching token", () => {
  const result = runCsrfMiddleware({
    path: "/auth/register",
    cookie: `${XSRF_TOKEN_COOKIE}=csrf-1`,
    header: "csrf-1",
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.responseState.statusCode, 200);
});

test("csrfProtection rejects session-backed mutations without matching token", () => {
  const result = runCsrfMiddleware({
    cookie: `${AUTH_SESSION_COOKIE}=session-token; ${XSRF_TOKEN_COOKIE}=csrf-1`,
    header: "csrf-2",
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.responseState.statusCode, 403);
  assert.deepEqual(result.responseState.body, { message: "Invalid CSRF token" });
});

test("csrfProtection allows session-backed mutations with matching token", () => {
  const result = runCsrfMiddleware({
    cookie: `${AUTH_SESSION_COOKIE}=session-token; ${XSRF_TOKEN_COOKIE}=csrf-1`,
    header: "csrf-1",
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.responseState.statusCode, 200);
});
