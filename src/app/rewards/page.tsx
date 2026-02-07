"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

export default function RewardsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [ecoPoints, setEcoPoints] = useState(0);
  const [impacts, setImpacts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadRewards();
  }, [user]);

  const loadRewards = async () => {
    const { data } = await apiClient.get("/auth/validate");
    setEcoPoints(data?.ecoPoints || 0);
    const orders = await apiClient.get(`/orders/buyer/${user?.id}`);
    const impacts = (orders.data || []).flatMap((o: any) => o.ecoImpacts || []);
    setImpacts(impacts);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Eco Rewards</h1>
      <div className="card p-6 mt-6">
        <p className="text-sm text-gray-600">Total Eco Points</p>
        <p className="text-4xl font-semibold text-[var(--accent)]">{ecoPoints}</p>
      </div>

      <div className="card p-6 mt-8">
        <h2 className="text-xl font-semibold">Impact Log</h2>
        <div className="mt-4 space-y-3">
          {impacts.length === 0 ? (
            <p className="text-gray-500">No impact records yet.</p>
          ) : (
            impacts.map((impact: any) => (
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
