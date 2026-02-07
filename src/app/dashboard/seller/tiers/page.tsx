"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

const TIER_SYSTEM = [
  { name: "SEED", commission: "7%", minSales: 0 },
  { name: "SPROUT", commission: "10%", minSales: 1000 },
  { name: "GROWTH", commission: "15%", minSales: 5000 },
  { name: "BLOOM", commission: "20%", minSales: 10000 },
  { name: "EVERGREEN", commission: "25%", minSales: 25000 },
  { name: "EARTH_GUARDIAN", commission: "30%", minSales: 50000 },
];

export default function SellerTiers() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [totalSales, setTotalSales] = useState(0);
  const [currentTier, setCurrentTier] = useState("SEED");

  useEffect(() => {
    if (!user || user.role !== "SELLER") {
      router.push("/login");
      return;
    }
    fetchSeller();
  }, [user]);

  const fetchSeller = async () => {
    const { data } = await apiClient.get("/sellers");
    const seller = (data || []).find((s: any) => s.userId === user?.id);
    setTotalSales(Number(seller?.totalSales || 0));
    setCurrentTier(seller?.tier || "SEED");
  };

  const currentTierIndex = Math.max(0, TIER_SYSTEM.findIndex((t) => t.name === currentTier));
  const nextTier = currentTierIndex < TIER_SYSTEM.length - 1 ? TIER_SYSTEM[currentTierIndex + 1] : null;
  const salesForNextTier = nextTier ? nextTier.minSales - totalSales : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl">Seller Tiers</h1>

      <div className="card p-8 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl">{currentTier.replace("_", " ")}</h2>
            <p className="text-gray-600">Commission: {TIER_SYSTEM[currentTierIndex]?.commission}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Sales</p>
            <p className="text-3xl font-semibold">${totalSales.toFixed(2)}</p>
          </div>
        </div>
        {nextTier && (
          <div className="mt-6">
            <p className="text-sm">Earn ${salesForNextTier.toFixed(2)} more to reach {nextTier.name.replace("_", " ")}</p>
            <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
              <div
                className="bg-[var(--accent)] h-2 rounded-full"
                style={{
                  width: `${((totalSales - TIER_SYSTEM[currentTierIndex].minSales) / (nextTier.minSales - TIER_SYSTEM[currentTierIndex].minSales)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
