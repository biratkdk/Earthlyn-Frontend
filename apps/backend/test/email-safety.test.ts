import test from "node:test";
import assert from "node:assert/strict";
import { EmailService } from "../src/common/services/email.service";

function createService() {
  return new EmailService({
    get(key: string) {
      const values: Record<string, string> = {
        SENDGRID_API_KEY: "test-sendgrid-key",
        SENDGRID_FROM_EMAIL: "no-reply@example.com",
        NODE_ENV: "production",
      };
      return values[key];
    },
  } as any);
}

test("email templates escape dynamic HTML content", async () => {
  let requestBody = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (
    _url: string | URL | Request,
    init?: RequestInit,
  ) => {
    requestBody = String(init?.body ?? "");
    return new Response(null, { status: 202 });
  }) as typeof fetch;

  try {
    const service = createService();
    await service.sendWelcome(
      "buyer@example.com",
      '<script>alert("x")</script>',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestBody.includes("<script>"), false);
  assert.equal(requestBody.includes("&lt;script&gt;"), true);
});

test("email links reject non-http protocols", async () => {
  let requestBody = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (
    _url: string | URL | Request,
    init?: RequestInit,
  ) => {
    requestBody = String(init?.body ?? "");
    return new Response(null, { status: 202 });
  }) as typeof fetch;

  try {
    const service = createService();
    await service.sendPasswordReset("buyer@example.com", "javascript:alert(1)");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestBody.includes("javascript:"), false);
  assert.equal(requestBody.includes('href=\\"#\\"'), true);
});
