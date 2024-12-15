"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { getErrorMessage } from "@/lib/utils/errors";
import { getAssetUrl } from "@/lib/utils/assets";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";
import type { ApiSeller } from "@/lib/types/api";

const KYC_PAGE_SIZE = 10;
const KYC_FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

type KycFilter = (typeof KYC_FILTERS)[number];

function formatStatus(status?: string) {
  return (status || "PENDING").replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function statusClassName(status?: string) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export default function AdminKycPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [requests, setRequests] = useState<ApiSeller[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<KycFilter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingSellerId, setReviewingSellerId] = useState<string | null>(
    null,
  );
  const [rejectingSellerId, setRejectingSellerId] = useState<string | null>(
    null,
  );
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(KYC_PAGE_SIZE),
        status: statusFilter,
      });
      const { data } = await apiClient.get(`/admin/kyc?${params.toString()}`);
      setRequests(getPaginatedItems<ApiSeller>(data));
      setPaginationMeta(getPaginationMeta<ApiSeller>(data));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load KYC requests."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    void loadRequests();
  }, [isHydrated, loadRequests, router, user]);

  const handleFilterChange = (nextStatus: KycFilter) => {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
    setRejectingSellerId(null);
  };

  const approveSeller = async (sellerId: string) => {
    setReviewingSellerId(sellerId);
    try {
      await apiClient.post(`/admin/kyc/${sellerId}/approve`);
      notify("KYC approved.", "success");
      await loadRequests();
    } catch (approveError) {
      notify(getErrorMessage(approveError, "Failed to approve KYC."), "error");
    } finally {
      setReviewingSellerId(null);
    }
  };

  const rejectSeller = async (sellerId: string) => {
    const reason = rejectReasons[sellerId]?.trim();
    if (!reason) {
      notify("Add a rejection reason before rejecting KYC.", "error");
      return;
    }

    setReviewingSellerId(sellerId);
    try {
      await apiClient.post(`/admin/kyc/${sellerId}/reject`, { reason });
      notify("KYC rejected.", "success");
      setRejectingSellerId(null);
      setRejectReasons((current) => ({ ...current, [sellerId]: "" }));
      await loadRequests();
    } catch (rejectError) {
      notify(getErrorMessage(rejectError, "Failed to reject KYC."), "error");
    } finally {
      setReviewingSellerId(null);
    }
  };

  if (!isHydrated || loading) {
    return <LoadingState />;
  }

  const totalItems = paginationMeta?.totalItems ?? requests.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Seller KYC Review</h1>
        <div className="flex flex-wrap gap-2">
          {KYC_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => handleFilterChange(filter)}
              className={
                statusFilter === filter
                  ? "btn-primary"
                  : "rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5"
              }
            >
              {formatStatus(filter)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <ErrorState className="mt-6" message={error} onRetry={loadRequests} />
      )}

      {!error && (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Seller</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Documents</th>
                <th className="px-6 py-3 text-left">Submitted</th>
                <th className="px-6 py-3 text-left">Reviewed</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No KYC requests found.
                  </td>
                </tr>
              ) : (
                requests.map((seller) => {
                  const isReviewing = reviewingSellerId === seller.id;
                  const canReview = seller.kycStatus === "PENDING";

                  return (
                    <tr key={seller.id} className="border-b align-top">
                      <td className="px-6 py-4">
                        <p className="font-semibold">
                          {seller.user?.name || "Seller"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {seller.user?.email || seller.userId}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {seller.user?.emailVerifiedAt
                            ? "Email verified"
                            : "Email unverified"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(
                            seller.kycStatus,
                          )}`}
                        >
                          {formatStatus(seller.kycStatus)}
                        </span>
                        {seller.kycRejectionReason && (
                          <p className="mt-2 max-w-52 text-xs text-red-700">
                            {seller.kycRejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-48 flex-col gap-2">
                          {(seller.kycDocuments || []).map((document) => {
                            const documentUrl = getAssetUrl(document.url);
                            return documentUrl ? (
                              <a
                                key={document.id}
                                href={documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[var(--accent)] hover:underline"
                              >
                                {formatStatus(document.docType)}
                                <span className="ml-2 text-xs text-gray-500">
                                  {formatStatus(document.status)}
                                </span>
                              </a>
                            ) : (
                              <span key={document.id}>
                                {formatStatus(document.docType)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(seller.kycDocuments?.[0]?.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(seller.kycReviewedAt)}
                      </td>
                      <td className="px-6 py-4">
                        {canReview ? (
                          <div className="flex min-w-56 flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void approveSeller(seller.id)}
                                disabled={isReviewing}
                                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRejectingSellerId((current) =>
                                    current === seller.id ? null : seller.id,
                                  )
                                }
                                disabled={isReviewing}
                                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                            {rejectingSellerId === seller.id && (
                              <div className="space-y-2">
                                <textarea
                                  value={rejectReasons[seller.id] || ""}
                                  onChange={(event) =>
                                    setRejectReasons((current) => ({
                                      ...current,
                                      [seller.id]: event.target.value,
                                    }))
                                  }
                                  rows={3}
                                  maxLength={500}
                                  placeholder="Rejection reason"
                                  className="w-full rounded-lg border border-black/10 px-3 py-2"
                                />
                                <button
                                  type="button"
                                  onClick={() => void rejectSeller(seller.id)}
                                  disabled={isReviewing}
                                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Confirm reject
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="px-6 pb-6">
            <PaginationControls
              currentPage={currentPage}
              itemLabel="KYC requests"
              pageSize={KYC_PAGE_SIZE}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
