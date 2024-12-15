"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import type { ApiDispute } from "@/lib/types/api";
import { getErrorMessage } from "@/lib/utils/errors";

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function formatOrderReference(orderId: string) {
  return `Order #${orderId.slice(0, 8).toUpperCase()}`;
}

function isClosedDispute(status: string) {
  return status === "RESOLVED" || status === "REJECTED";
}

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [dispute, setDispute] = useState<ApiDispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDispute = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setLoadError("");
    try {
      const { data } = await apiClient.get<ApiDispute>(`/disputes/${id}`);
      setDispute(data);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load dispute."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    void loadDispute();
  }, [isHydrated, loadDispute, router, user]);

  const submitResponse = async (event: React.FormEvent) => {
    event.preventDefault();

    const message = response.trim();
    if (!id || !message) return;

    setSubmitting(true);
    try {
      const { data } = await apiClient.post<ApiDispute>(
        `/disputes/${id}/respond`,
        { message },
      );
      setDispute(data);
      setResponse("");
      notify("Response added.", "success");
    } catch (error) {
      notify(getErrorMessage(error, "Failed to add response."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isHydrated || loading) {
    return <LoadingState className="mx-auto max-w-4xl px-4 py-12" rows={4} />;
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState message={loadError} onRetry={loadDispute} />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-gray-500">
        Dispute not found.
      </div>
    );
  }

  const closed = isClosedDispute(dispute.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/disputes" className="btn-secondary mb-6 inline-block">
        Back to disputes
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {formatOrderReference(dispute.orderId)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold">
              Dispute #{dispute.id.slice(0, 8).toUpperCase()}
            </h1>
          </div>
          <span className="badge">{dispute.status}</span>
        </div>

        <div className="mt-6 grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-gray-900">Opened</p>
            <p>{formatDate(dispute.createdAt)}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Due</p>
            <p>{formatDate(dispute.dueAt)}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Priority</p>
            <p>{dispute.priority || "MEDIUM"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-black/10 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Reason
          </p>
          <p className="mt-2 whitespace-pre-wrap text-gray-800">
            {dispute.reason || "No reason provided."}
          </p>
        </div>

        {dispute.resolution && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Resolution
            </p>
            <p className="mt-2 whitespace-pre-wrap">{dispute.resolution}</p>
          </div>
        )}
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-xl font-semibold">Responses</h2>
        {dispute.messages?.length ? (
          <div className="mt-4 space-y-4">
            {dispute.messages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg border border-black/10 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <p className="font-semibold">
                    {message.user?.name || "User"}
                    {message.user?.role ? ` (${message.user.role})` : ""}
                  </p>
                  <p className="text-gray-500">
                    {formatDate(message.createdAt)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-gray-800">
                  {message.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-gray-500">No responses yet.</p>
        )}

        {!closed && (
          <form onSubmit={submitResponse} className="mt-6 space-y-3">
            <label htmlFor="dispute-response" className="text-sm font-medium">
              Add response
            </label>
            <textarea
              id="dispute-response"
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Add details, evidence, or a resolution offer."
              className="w-full rounded-xl border border-black/10 px-4 py-3"
            />
            <button
              type="submit"
              disabled={submitting || !response.trim()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit response"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
