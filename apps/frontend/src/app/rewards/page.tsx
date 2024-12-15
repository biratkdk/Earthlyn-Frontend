"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import type { ApiEcoImpact } from "@/lib/types/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Skeleton } from "@/components/ui/Skeleton";

interface RewardsResponse {
  ecoPoints: number;
  impacts: ApiEcoImpact[];
}

export default function RewardsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [ecoPoints, setEcoPoints] = useState(0);
  const [impacts, setImpacts] = useState<ApiEcoImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get<RewardsResponse>("/buyers/me/rewards");
      setEcoPoints(data.ecoPoints || 0);
      setImpacts(data.impacts || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load rewards."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    void loadRewards();
  }, [user, router, loadRewards]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Eco Rewards</h1>
      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="card p-6 mt-6">
        <p className="text-sm text-gray-600">Total Eco Points</p>
        <p className="text-4xl font-semibold text-[var(--accent)]">
          {loading ? "..." : ecoPoints}
        </p>
      </div>

      <div className="card p-6 mt-8">
        <h2 className="text-xl font-semibold">Impact Log</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : impacts.length === 0 ? (
            <p className="text-gray-500">No impact records yet.</p>
          ) : (
            impacts.map((impact) => (
              <div key={impact.id} className="flex justify-between">
                <span>{impact.impact}</span>
                <span className="badge">+{impact.pointsEarned}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
