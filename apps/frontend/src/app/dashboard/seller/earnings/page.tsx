"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";
import { PaginationControls } from "@/components/ui/PaginationControls";
import type { PaginationMeta } from "@/lib/api/pagination";

interface SellerProfile {
  id: string;
  tier?: string;
  totalSales?: number | string;
}

interface EarningsTransaction {
  id: string;
  amount: number | string;
  description?: string;
  createdAt: string;
}

interface EarningsSummary {
  totalEarnings: number;
  totalOrders: number;
  averageOrderValue: number;
  transactions: EarningsTransaction[];
  transactionsMeta?: PaginationMeta;
}

interface ProfitSummary {
  totalSales: number;
  totalEarnings: number;
  currentTier: string;
  orderCount: number;
}

const RANGE_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];
const EARNINGS_PAGE_SIZE = 10;
const EMPTY_TRANSACTIONS: EarningsTransaction[] = [];

function formatTransactionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString();
}

function getDateRangeQuery(range: string) {
  if (range === "all") return "";

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Number(range));
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
}

export default function SellerEarningsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [range, setRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const transactions = earnings?.transactions ?? EMPTY_TRANSACTIONS;

  const loadEarnings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      const { data: sellerData } = await apiClient.get<SellerProfile>(
        `/sellers/by-user/${user.id}`,
      );
      if (!sellerData?.id) {
        setSeller(null);
        setEarnings(null);
        setProfit(null);
        setError("Seller profile was not found. Complete seller onboarding first.");
        return;
      }
      const sellerId = sellerData.id;
      setSeller(sellerData);

      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(EARNINGS_PAGE_SIZE),
      });
      const rangeQuery = getDateRangeQuery(range);
      if (rangeQuery) {
        new URLSearchParams(rangeQuery.slice(1)).forEach((value, key) => {
          params.set(key, value);
        });
      }
      const [{ data: earningsData }, { data: profitData }] = await Promise.all([
        apiClient.get<EarningsSummary>(
          `/sellers/${sellerId}/earnings?${params.toString()}`,
        ),
        apiClient.get<ProfitSummary>(`/sellers/${sellerId}/profit-summary`),
      ]);

      setEarnings(earningsData);
      setProfit(profitData);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load seller earnings."));
    } finally {
      setLoading(false);
    }
  }, [currentPage, range, user]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "SELLER") {
      router.push("/dashboard");
      return;
    }

    void loadEarnings();
  }, [isHydrated, loadEarnings, router, user]);

  if (!isHydrated || loading) {
    return <LoadingState rows={4} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl">Seller Earnings</h1>
          <p className="mt-2 text-gray-600">
            Track credited delivery profits, total sales, and order value.
          </p>
        </div>
        <select
          value={range}
          onChange={(event) => {
            setRange(event.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-black/10 px-3 py-2"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState className="mt-6" message={error} onRetry={loadEarnings} />
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="card p-5">
              <p className="text-sm text-gray-600">Credited Earnings</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
                ${Number(earnings?.totalEarnings || 0).toFixed(2)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-600">Delivered Orders</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
                {earnings?.totalOrders || 0}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-600">Average Order</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
                ${Number(earnings?.averageOrderValue || 0).toFixed(2)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-600">Tier</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
                {(profit?.currentTier || seller?.tier || "SEED").replaceAll("_", " ")}
              </p>
            </div>
          </div>

          <div className="card mt-8 overflow-hidden">
            <div className="border-b p-6">
              <h2 className="text-xl font-semibold">Recent Earnings</h2>
              <p className="mt-1 text-sm text-gray-600">
                Total sales: ${Number(profit?.totalSales || seller?.totalSales || 0).toFixed(2)}
              </p>
            </div>
            {!transactions.length ? (
              <p className="p-6 text-gray-500">No earnings in this range.</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Description</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b">
                        <td className="px-6 py-4">
                          {formatTransactionDate(transaction.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          {transaction.description || "Order delivery profit"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[var(--accent)]">
                          ${Number(transaction.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-6 pb-6">
                  <PaginationControls
                    currentPage={currentPage}
                    itemLabel="transactions"
                    pageSize={EARNINGS_PAGE_SIZE}
                    totalItems={earnings?.transactionsMeta?.totalItems ?? transactions.length}
                    totalPages={earnings?.transactionsMeta?.totalPages ?? 1}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
