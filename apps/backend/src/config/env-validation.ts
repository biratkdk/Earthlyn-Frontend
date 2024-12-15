import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;
const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().optional(),
);
const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRATION: z.string().default("7d"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  MESSAGE_ENCRYPTION_KEY: z
    .string()
    .min(32, "MESSAGE_ENCRYPTION_KEY must be at least 32 characters"),
  CORS_ORIGIN: z.string().default("*"),
  THROTTLE_TTL: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(100),
  ALLOW_ADMIN_REGISTRATION: z.enum(["true", "false"]).default("false"),
  REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false"]).default("false"),
  AUTO_FULFILL: z.enum(["true", "false"]).default("false"),
  AUTO_FULFILL_STEP_HOURS: z.coerce.number().positive().default(24),
  ENABLE_SWAGGER: z.enum(["true", "false"]).default("false"),
  REDIS_URL: optionalString,
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: optionalString,
  QUEUE_DRIVER: z.enum(["inline", "bullmq"]).default("inline"),
  QUEUE_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  QUEUE_JOB_BACKOFF_MS: z.coerce.number().int().min(100).default(5000),
  QUEUE_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  PROCESSING_FEE_RATE: z.coerce.number().min(0).max(1).default(0.05),
  ECO_POINTS_PER_DOLLAR: z.coerce.number().min(0).default(1),
  SENDGRID_API_KEY: optionalString,
  SENDGRID_FROM_EMAIL: z.preprocess(
    emptyStringToUndefined,
    z.string().email().optional(),
  ),
  AUTH_COOKIE_DOMAIN: optionalString,
  FRONTEND_URL: optionalUrl,
  UPLOAD_DIR: optionalString,
  UPLOAD_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  UPLOAD_S3_ENDPOINT: optionalUrl,
  UPLOAD_S3_REGION: optionalString,
  UPLOAD_S3_BUCKET: optionalString,
  UPLOAD_S3_ACCESS_KEY_ID: optionalString,
  UPLOAD_S3_SECRET_ACCESS_KEY: optionalString,
  UPLOAD_S3_PUBLIC_BASE_URL: optionalUrl,
  UPLOAD_S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof envSchema>;

const productionPlaceholders: Partial<Record<keyof Env, string[]>> = {
  JWT_SECRET: [
    "change-this-jwt-secret-to-a-32-plus-character-value",
    "replace-with-at-least-32-random-characters",
  ],
  MESSAGE_ENCRYPTION_KEY: [
    "change-this-message-encryption-key-32-plus",
    "replace-with-at-least-32-random-characters",
  ],
  STRIPE_SECRET_KEY: [
    "sk_test_change_me",
    "sk_test_replace_for_local_or_sk_live_for_production",
  ],
  STRIPE_WEBHOOK_SECRET: [
    "whsec_change_me",
    "whsec_replace_with_real_webhook_secret",
  ],
  SENDGRID_API_KEY: ["change_me", "replace-with-real-sendgrid-api-key"],
  SENDGRID_FROM_EMAIL: ["no-reply@example.com", "no-reply@your-domain.example"],
};

function rejectProductionPlaceholders(parsed: Env) {
  for (const [key, placeholders] of Object.entries(productionPlaceholders) as [
    keyof Env,
    string[],
  ][]) {
    const value = parsed[key];
    if (
      typeof value === "string" &&
      placeholders.includes(value.trim().toLowerCase())
    ) {
      throw new Error(`${key} must not use a placeholder value in production`);
    }
  }
}

export function validateEnv(env: NodeJS.ProcessEnv): Env {
  try {
    const parsed = envSchema.parse(env);
    if (parsed.NODE_ENV === "production" && parsed.CORS_ORIGIN === "*") {
      throw new Error("CORS_ORIGIN must not be '*' in production");
    }
    if (
      parsed.NODE_ENV === "production" &&
      (!parsed.SENDGRID_API_KEY || !parsed.SENDGRID_FROM_EMAIL)
    ) {
      throw new Error(
        "SENDGRID_API_KEY and SENDGRID_FROM_EMAIL are required in production",
      );
    }
    if (parsed.NODE_ENV === "production") {
      rejectProductionPlaceholders(parsed);
    }
    if (parsed.UPLOAD_STORAGE_DRIVER === "s3") {
      const missing = [
        "UPLOAD_S3_BUCKET",
        "UPLOAD_S3_ACCESS_KEY_ID",
        "UPLOAD_S3_SECRET_ACCESS_KEY",
        "UPLOAD_S3_PUBLIC_BASE_URL",
      ].filter((key) => !parsed[key as keyof Env]);

      if (missing.length) {
        throw new Error(
          `S3 upload storage is missing required env vars: ${missing.join(", ")}`,
        );
      }
    }
    return parsed;
  } catch (error) {
    const message =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    process.stderr.write(`[env-validation] ${message}\n`);
    throw error;
  }
}
