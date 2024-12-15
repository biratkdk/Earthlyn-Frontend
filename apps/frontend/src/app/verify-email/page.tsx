"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { LoadingState } from "@/components/ui/Skeleton";
import { getErrorMessage } from "@/lib/utils/errors";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        await apiClient.post("/auth/verify-email", { token });
        if (!cancelled) {
          setStatus("success");
          setMessage("Your email has been verified.");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(getErrorMessage(error, "Email verification failed."));
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const effectiveStatus = token ? status : "error";
  const effectiveMessage = token ? message : "Verification token is missing.";

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-16">
      <div className="card w-full p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)]">
          Email verification
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Verify Email</h1>

        {effectiveStatus === "loading" ? (
          <LoadingState className="mt-6" rows={2} />
        ) : (
          <>
            <div
              className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
                effectiveStatus === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {effectiveMessage}
            </div>
            <Link href="/login" className="btn-primary mt-6 inline-block">
              Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState className="mx-auto max-w-md px-4 py-16" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
