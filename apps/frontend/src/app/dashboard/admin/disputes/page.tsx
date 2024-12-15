"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminOperationsApi,
  type AdminDisputeStatus,
} from "@/lib/api/admin-operations";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { useAuthStore } from "@/lib/store/auth";
import type { ApiDispute } from "@/lib/types/api";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { LoadingState } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";

const DISPUTE_PAGE_SIZE = 8;
const STATUS_OPTIONS: AdminDisputeStatus[] = [
  "ALL",
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "REJECTED",
];
const UPDATE_STATUS_OPTIONS: Exclude<AdminDisputeStatus, "ALL">[] = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "REJECTED",
];

function formatStatus(status?: string) {
  return (status || "-").replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatCurrency(value?: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function shortId(id?: string) {
  return id ? id.slice(0, 8) : "-";
}

export default function AdminDisputesPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState<AdminDisputeStatus>("OPEN");
  const [drafts, setDrafts] = useState<
    Record<string, { status: Exclude<AdminDisputeStatus, "ALL">; resolution: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminOperationsApi.disputes({
        page: currentPage,
        pageSize: DISPUTE_PAGE_SIZE,
        status,
      });
      const items = getPaginatedItems<ApiDispute>(data);
      setDisputes(items);
      setPaginationMeta(getPaginationMeta<ApiDispute>(data));
      setDrafts((current) => {
        const next = { ...current };
        items.forEach((dispute) => {
          if (!next[dispute.id]) {
            next[dispute.id] = {
              status: (dispute.status || "OPEN") as Exclude<
                AdminDisputeStatus,
                "ALL"
              >,
              resolution: dispute.resolution || "",
            };
          }
        });
        return next;
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load disputes."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, status]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !["ADMIN", "CUSTOMER_SERVICE"].includes(user.role)) {
      router.push("/login");
      return;
    }
    void loadDisputes();
  }, [isHydrated, loadDisputes, router, user]);

  const updateDispute = async (dispute: ApiDispute) => {
    const draft = drafts[dispute.id];
    if (!draft) return;
    if (draft.status === "RESOLVED" && draft.resolution.trim().length < 5) {
      notify("Add a resolution before resolving the dispute.", "error");
      return;
    }

    setUpdatingId(dispute.id);
    try {
      await adminOperationsApi.updateDispute(dispute.id, {
        status: draft.status,
        resolution: draft.resolution.trim() || undefined,
      });
      notify("Dispute updated.", "success");
      await loadDisputes();
    } catch (updateError) {
      notify(getErrorMessage(updateError, "Failed to update dispute."), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isHydrated || loading) return <LoadingState rows={5} />;

  const totalItems = paginationMeta?.totalItems ?? disputes.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/admin" className="btn-secondary inline-block">
            Back to Admin
          </Link>
          <h1 className="mt-6 text-4xl">Dispute Management</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Review buyer and seller disputes, assign status, and record
            operational resolutions.
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => {
            setCurrentPage(1);
            setStatus(event.target.value as AdminDisputeStatus);
          }}
          className="rounded-xl border border-black/10 bg-white px-3 py-2"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatStatus(option)}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState className="mt-8" message={error} onRetry={loadDisputes} />
      ) : disputes.length === 0 ? (
        <p className="mt-8 rounded-lg border border-black/10 p-6 text-gray-500">
          No disputes match the current filter.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {disputes.map((dispute) => {
            const draft = drafts[dispute.id] || {
              status: (dispute.status || "OPEN") as Exclude<
                AdminDisputeStatus,
                "ALL"
              >,
              resolution: dispute.resolution || "",
            };
            return (
              <div key={dispute.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="badge">{formatStatus(dispute.priority)}</p>
                    <h2 className="mt-3 text-xl font-semibold">
                      Order {shortId(dispute.orderId)}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600">
                      {dispute.reason || "No reason provided."}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                      <span>Status: {formatStatus(dispute.status)}</span>
                      <span>Opened: {formatDate(dispute.createdAt)}</span>
                      <span>Due: {formatDate(dispute.dueAt)}</span>
                      <span>
                        Order total:{" "}
                        {formatCurrency(dispute.order?.totalAmount)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Opened by {dispute.openedBy?.email || dispute.openedById}
                    </p>
                  </div>
                  <div className="grid min-w-[18rem] gap-3">
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [dispute.id]: {
                            ...draft,
                            status: event.target.value as Exclude<
                              AdminDisputeStatus,
                              "ALL"
                            >,
                          },
                        }))
                      }
                      className="rounded-xl border border-black/10 bg-white px-3 py-2"
                    >
                      {UPDATE_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatStatus(option)}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={draft.resolution}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [dispute.id]: {
                            ...draft,
                            resolution: event.target.value,
                          },
                        }))
                      }
                      rows={3}
                      placeholder="Resolution note"
                      className="rounded-xl border border-black/10 px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => void updateDispute(dispute)}
                      disabled={updatingId === dispute.id}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingId === dispute.id ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <PaginationControls
            currentPage={currentPage}
            itemLabel="disputes"
            pageSize={DISPUTE_PAGE_SIZE}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
