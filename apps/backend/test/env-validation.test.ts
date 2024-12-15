import test from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "../src/config/env-validation";

const productionEnv = {
  NODE_ENV: "production",
  PORT: "3001",
  DATABASE_URL: "postgresql://earthlyn:password@localhost:5432/earthlyn?schema=public",
  JWT_SECRET: "production_jwt_secret_32_chars_min",
  JWT_EXPIRATION: "7d",
  STRIPE_SECRET_KEY: "sk_live_valid_for_test",
  STRIPE_WEBHOOK_SECRET: "whsec_valid_for_test",
  MESSAGE_ENCRYPTION_KEY: "message_encryption_key_32_chars_min",
  CORS_ORIGIN: "https://earthlyn.example",
  SENDGRID_API_KEY: "SG.valid_for_test",
  SENDGRID_FROM_EMAIL: "no-reply@earthlyn.example",
};

test("validateEnv accepts a complete production configuration", () => {
  const parsed = validateEnv(productionEnv);

  assert.equal(parsed.NODE_ENV, "production");
  assert.equal(parsed.CORS_ORIGIN, "https://earthlyn.example");
});

test("validateEnv rejects wildcard CORS in production", () => {
  assert.throws(
    () => validateEnv({ ...productionEnv, CORS_ORIGIN: "*" }),
    /CORS_ORIGIN must not be '\*' in production/,
  );
});

test("validateEnv rejects known production placeholders", () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnv,
        JWT_SECRET: "change-this-jwt-secret-to-a-32-plus-character-value",
      }),
    /JWT_SECRET must not use a placeholder value in production/,
  );
});

test("validateEnv rejects example environment placeholders", () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnv,
        STRIPE_SECRET_KEY: "sk_test_replace_for_local_or_sk_live_for_production",
      }),
    /STRIPE_SECRET_KEY must not use a placeholder value in production/,
  );
});

test("validateEnv requires email configuration in production", () => {
  const { SENDGRID_API_KEY: _apiKey, ...envWithoutEmail } = productionEnv;

  assert.throws(
    () => validateEnv(envWithoutEmail),
    /SENDGRID_API_KEY and SENDGRID_FROM_EMAIL are required in production/,
  );
});
