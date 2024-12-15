"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { LoadingState } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";

const TIER_SYSTEM = [
  { name: "SEED", commission: "7%", minSales: 0 },
  { name: "SPROUT", commission: "10%", minSales: 1000 },
  { name: "GROWTH", commission: "15%", minSales: 5000 },
  { name: "BLOOM", commission: "20%", minSales: 10000 },
  { name: "EVERGREEN", commission: "25%", minSales: 25000 },
  { name: "EARTH_GUARDIAN", commission: "30%", minSales: 50000 },
];
const formatTierName = (value: string) => value.replaceAll("_", " ");

export default function SellerTiers() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [totalSales, setTotalSales] = useState(0);
  const [currentTier, setCurrentTier] = useState("SEED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const loadSellerTier = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const { data: seller } = await apiClient.get(`/sellers/by-user/${user.id}`);
      setTotalSales(Number(seller?.totalSales || 0));
      setCurrentTier(seller?.tier || "SEED");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load seller tier."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "SELLER") {
      router.push("/login");
      return;
    }

    void loadSellerTier();
  }, [user, router, retryKey, loadSellerTier]);

  const currentTierIndex = Math.max(0, TIER_SYSTEM.findIndex((t) => t.name === currentTier));
  const nextTier = currentTierIndex < TIER_SYSTEM.length - 1 ? TIER_SYSTEM[currentTierIndex + 1] : null;
  const salesForNextTier = nextTier ? nextTier.minSales - totalSales : 0;
  const progressToNextTier = nextTier
    ? Math.min(
        Math.max(
          ((totalSales - TIER_SYSTEM[currentTierIndex].minSales) /
            (nextTier.minSales - TIER_SYSTEM[currentTierIndex].minSales)) *
            100,
          0,
        ),
        100,
      )
    : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl">Seller Tiers</h1>

      {loading ? (
        <LoadingState className="mt-8" rows={3} />
      ) : error ? (
        <ErrorState
          className="mt-8"
          message={error}
          onRetry={() => setRetryKey((current) => current + 1)}
        />
      ) : (
      <div className="card p-8 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl">{formatTierName(currentTier)}</h2>
            <p className="text-gray-600">Commission: {TIER_SYSTEM[currentTierIndex]?.commission}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Sales</p>
            <p className="text-3xl font-semibold">${totalSales.toFixed(2)}</p>
          </div>
        </div>
        {nextTier && (
          <div className="mt-6">
            <p className="text-sm">
              Earn ${salesForNextTier.toFixed(2)} more to reach {formatTierName(nextTier.name)}
            </p>
            <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
              <div
                className="bg-[var(--accent)] h-2 rounded-full"
                style={{
                  width: `${progressToNextTier}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
