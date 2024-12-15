"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import type { ApiSubscription } from "@/lib/types/api";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  BUYER_SUBSCRIPTION_PLANS,
  cancelSubscription as cancelExistingSubscription,
  createSubscription as startSubscription,
  getMySubscriptions,
} from "@/lib/api/growth";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";

const SUBSCRIPTION_PAGE_SIZE = 8;
type BuyerPlan = {
  value: string;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  benefits: string[];
};
const FALLBACK_SUBSCRIPTION_PLANS: BuyerPlan[] = BUYER_SUBSCRIPTION_PLANS.map(
  (plan) => ({ ...plan, benefits: [...plan.benefits] }),
);
const formatPlanName = (value: string, plans: BuyerPlan[]) =>
  plans.find((plan) => plan.value === value)?.name ||
  value.replaceAll("_", " ");

export default function SubscriptionPage() {
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<ApiSubscription[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [plan, setPlan] = useState<string>(
    FALLBACK_SUBSCRIPTION_PLANS[0].value,
  );
  const [updating, setUpdating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<ApiSubscription | null>(
    null,
  );

  const fetchSubscriptions = useCallback(async () => {
    const data = await getMySubscriptions(currentPage, SUBSCRIPTION_PAGE_SIZE);
    setPaginationMeta(getPaginationMeta<ApiSubscription>(data));
    return getPaginatedItems<ApiSubscription>(data);
  }, [currentPage]);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const nextSubscriptions = await fetchSubscriptions();
      setSubscriptions(nextSubscriptions);
      setPlan((current) =>
        FALLBACK_SUBSCRIPTION_PLANS.some((item) => item.value === current)
          ? current
          : FALLBACK_SUBSCRIPTION_PLANS[0].value,
      );
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load subscriptions."));
    } finally {
      setLoading(false);
    }
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    void loadSubscriptions();
  }, [user, isHydrated, router, loadSubscriptions, retryKey]);

  const createSubscription = async () => {
    setUpdating("create");
    try {
      await startSubscription(plan);
      setCurrentPage(1);
      const data = await getMySubscriptions(1, SUBSCRIPTION_PAGE_SIZE);
      setPaginationMeta(getPaginationMeta<ApiSubscription>(data));
      setSubscriptions(getPaginatedItems<ApiSubscription>(data));
      notify("Subscription created.", "success");
    } catch (error) {
      notify(getErrorMessage(error, "Failed to create subscription."), "error");
    } finally {
      setUpdating(null);
    }
  };

  const cancelSubscription = async () => {
    if (!cancelTarget) return;

    setUpdating(cancelTarget.id);
    try {
      await cancelExistingSubscription(cancelTarget.id);
      setSubscriptions(await fetchSubscriptions());
      setCancelTarget(null);
      notify("Subscription cancelled.", "success");
    } catch (error) {
      notify(getErrorMessage(error, "Failed to cancel subscription."), "error");
    } finally {
      setUpdating(null);
    }
  };

  if (!isHydrated) return <LoadingState />;

  const totalItems = paginationMeta?.totalItems ?? subscriptions.length;
  const totalPages = paginationMeta?.totalPages ?? 1;
  const activeCount = subscriptions.filter(
    (item) => item.status === "ACTIVE",
  ).length;
  const selectedPlan = FALLBACK_SUBSCRIPTION_PLANS.find(
    (item) => item.value === plan,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="badge inline-block">Recurring discovery</p>
      <h1 className="mt-4 text-4xl">Eco-Box Subscription</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Pick a monthly curation level and keep your low-waste product discovery
        moving without hunting through the catalog every week.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-gray-600">Total subscriptions</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
            {totalItems}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-600">Active on this page</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
            {activeCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-600">Selected plan</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
            {selectedPlan?.price || "$0"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingState className="py-2" rows={3} />
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => setRetryKey((current) => current + 1)}
          />
        ) : (
          <>
            <section className="card p-6">
              <h2 className="text-xl font-semibold">Choose a plan</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {FALLBACK_SUBSCRIPTION_PLANS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPlan(item.value)}
                    className={`rounded-lg border p-5 text-left transition ${
                      plan === item.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-black/10 bg-white hover:border-[var(--accent)]/40"
                    }`}
                  >
                    <span className="text-lg font-semibold">{item.name}</span>
                    <span className="mt-2 block text-3xl font-semibold text-[var(--accent)]">
                      {item.price}
                    </span>
                    <span className="block text-sm text-gray-600">
                      {item.cadence}
                    </span>
                    <span className="mt-3 block text-sm text-gray-700">
                      {item.summary}
                    </span>
                    <span className="mt-4 block space-y-2 text-sm text-gray-600">
                      {item.benefits.map((benefit) => (
                        <span key={benefit} className="block">
                          {benefit}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={createSubscription}
                disabled={updating === "create"}
                className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updating === "create" ? "Subscribing..." : "Subscribe"}
              </button>
            </section>

            <section className="card mt-6 p-6">
              <h2 className="text-xl font-semibold">Your subscriptions</h2>
              <div className="mt-4 space-y-3">
                {subscriptions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-black/15 p-5 text-gray-600">
                    No subscriptions yet. Choose a box above to start recurring
                    eco discovery.
                  </div>
                ) : (
                  <>
                    {subscriptions.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold">
                            {formatPlanName(
                              item.plan,
                              FALLBACK_SUBSCRIPTION_PLANS,
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            Started{" "}
                            {item.startedAt
                              ? new Date(item.startedAt).toLocaleDateString()
                              : "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge">{item.status}</span>
                          {item.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(item)}
                              disabled={updating === item.id}
                              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {updating === item.id
                                ? "Cancelling..."
                                : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <PaginationControls
                      currentPage={currentPage}
                      itemLabel="subscriptions"
                      pageSize={SUBSCRIPTION_PAGE_SIZE}
                      totalItems={totalItems}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel subscription?"
          description={`Cancel ${formatPlanName(cancelTarget.plan, FALLBACK_SUBSCRIPTION_PLANS)} now? Benefits end immediately.`}
          confirmLabel="Cancel subscription"
          isDestructive
          isLoading={updating === cancelTarget.id}
          onCancel={() => setCancelTarget(null)}
          onConfirm={() => void cancelSubscription()}
        />
      )}
    </div>
  );
}
