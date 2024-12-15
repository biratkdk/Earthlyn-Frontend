"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { getErrorMessage } from "@/lib/utils/errors";

const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSubmitted(true);
      setCooldown(PASSWORD_RESET_COOLDOWN_SECONDS);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Could not request a password reset."));
      setCooldown(PASSWORD_RESET_COOLDOWN_SECONDS);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)]">
          Account recovery
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Reset your password</h1>

        {submitted && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              If an account exists for that email, a reset link has been sent.
            </div>
          </div>
        )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-black/10 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || cooldown > 0}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Sending..."
                : cooldown > 0
                  ? `${submitted ? "Resend" : "Try again"} in ${cooldown}s`
                  : submitted
                    ? "Resend reset link"
                    : "Send reset link"}
            </button>
            {submitted && (
              <Link href="/login" className="btn-secondary inline-block w-full text-center">
                Back to Login
              </Link>
            )}
          </form>
      </div>
    </div>
  );
}
