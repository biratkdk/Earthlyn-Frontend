const LOCAL_BACKEND_URL = "http://localhost:3001";
const STRIPE_PLACEHOLDER_KEYS = new Set([
  "pk_test_your_stripe_publishable_key",
  "pk_test_replace_for_local_or_pk_live_for_production",
]);

export function getPublicBackendUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (!rawUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_BACKEND_URL is required in production.");
    }

    console.warn(
      `[config] NEXT_PUBLIC_BACKEND_URL not set, falling back to ${LOCAL_BACKEND_URL}`,
    );
    return LOCAL_BACKEND_URL;
  }

  try {
    return new URL(rawUrl).toString().replace(/\/$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_BACKEND_URL must be a valid URL.");
  }
}

export function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

  if (!key || STRIPE_PLACEHOLDER_KEYS.has(key)) {
    return null;
  }

  if (!/^pk_(test|live)_/.test(key)) {
    return null;
  }

  return key;
}
