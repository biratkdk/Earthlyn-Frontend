"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import type { ApiReferral } from "@/lib/types/api";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import {
  createReferral as sendReferral,
  getMyReferrals,
} from "@/lib/api/growth";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

const REFERRAL_PAGE_SIZE = 8;

export default function ReferralsPage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [referrals, setReferrals] = useState<ApiReferral[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refereeEmail, setRefereeEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const fetchReferrals = useCallback(async () => {
    const data = await getMyReferrals(currentPage, REFERRAL_PAGE_SIZE);
    setPaginationMeta(getPaginationMeta<ApiReferral>(data));
    return getPaginatedItems<ApiReferral>(data);
  }, [currentPage]);

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      setReferrals(await fetchReferrals());
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load referrals."));
    } finally {
      setLoading(false);
    }
  }, [fetchReferrals]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    void loadReferrals();
  }, [user, isHydrated, router, loadReferrals, retryKey]);

  const inviteMessage = useMemo(
    () =>
      `Join EARTHLYN with ${user?.name || "me"} and discover verified eco products. Create your account, then share your email so I can send the referral invite.`,
    [user?.name],
  );

  const handleCreateReferral = async () => {
    if (!refereeEmail) {
      notify("Enter the user's email address.", "error");
      return;
    }

    try {
      await sendReferral(refereeEmail);
      setRefereeEmail("");
      setCurrentPage(1);
      notify("Referral sent.", "success");
      const data = await getMyReferrals(1, REFERRAL_PAGE_SIZE);
      setPaginationMeta(getPaginationMeta<ApiReferral>(data));
      setReferrals(getPaginatedItems<ApiReferral>(data));
    } catch (error) {
      notify(getErrorMessage(error, "Failed to send referral"), "error");
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      notify("Invite copy saved.", "success");
    } catch {
      notify("Copy failed. Select the invite text manually.", "error");
    }
  };

  if (!isHydrated) return <LoadingState />;

  const totalItems = paginationMeta?.totalItems ?? referrals.length;
  const totalPages = paginationMeta?.totalPages ?? 1;
  const completedCount = referrals.filter(
    (referral) => referral.status === "COMPLETED",
  ).length;
  const pendingCount = referrals.filter(
    (referral) => referral.status === "PENDING",
  ).length;
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="badge inline-block">Buyer growth</p>
          <h1 className="mt-4 text-4xl">Referrals</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Invite people who already have an EARTHLYN account and track each
            referral through completion.
          </p>
        </div>
        <button type="button" onClick={copyInvite} className="btn-secondary">
          Copy invite copy
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-gray-600">Tracked referrals</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
            {totalItems}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
            {pendingCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-600">Completed on this page</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
            {completedCount}
          </p>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Share message</h2>
        <p className="mt-3 rounded-lg border border-black/10 bg-[var(--muted)] p-4 text-sm text-gray-700">
          {inviteMessage}
        </p>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Invite a user</h2>
        <p className="mt-2 text-sm text-gray-600">
          The current API matches referrals to an existing user email.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            placeholder="user@example.com"
            value={refereeEmail}
            onChange={(e) => setRefereeEmail(e.target.value)}
            className="flex-1 rounded-xl border border-black/10 px-4 py-2"
          />
          <button onClick={handleCreateReferral} className="btn-primary">
            Send
          </button>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Your referrals</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <LoadingState className="py-2" rows={2} />
          ) : loadError ? (
            <ErrorState
              message={loadError}
              onRetry={() => setRetryKey((current) => current + 1)}
            />
          ) : referrals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 p-5 text-gray-600">
              Send your first referral to start building your invite history.
            </div>
          ) : (
            <>
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">
                      {referral.referee?.name ||
                        referral.referee?.email ||
                        referral.refereeId}
                    </p>
                    {referral.createdAt && (
                      <p className="text-sm text-gray-500">
                        Sent {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      referral.status === "COMPLETED"
                        ? "badge-success rounded-full px-3 py-1 text-xs font-semibold"
                        : "badge-warning rounded-full px-3 py-1 text-xs font-semibold"
                    }
                  >
                    {referral.status}
                  </span>
                </div>
              ))}
              <PaginationControls
                currentPage={currentPage}
                itemLabel="referrals"
                pageSize={REFERRAL_PAGE_SIZE}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
