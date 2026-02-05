"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

const TIER_SYSTEM = [
  { name: "Seed", commission: "7%", minSales: 0, color: "bg-yellow-100", emoji: "??" },
  { name: "Sprout", commission: "10%", minSales: 1000, color: "bg-green-100", emoji: "??" },
  { name: "Growth", commission: "15%", minSales: 5000, color: "bg-emerald-100", emoji: "??" },
  { name: "Bloom", commission: "20%", minSales: 15000, color: "bg-cyan-100", emoji: "??" },
  { name: "Evergreen", commission: "25%", minSales: 50000, color: "bg-blue-100", emoji: "??" },
  { name: "Earth Guardian", commission: "30%", minSales: 100000, color: "bg-purple-100", emoji: "??" },
];

export default function SellerTiers() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [totalSales, setTotalSales] = useState(0);
  const [currentTier, setCurrentTier] = useState("Seed");

  useEffect(() => {
    if (!user || user.role !== "seller") {
      router.push("/login");
      return;
    }
    // In real app, fetch from API
    setTotalSales(8500); // Mock data
    determineCurrentTier(8500);
  }, [user]);

  const determineCurrentTier = (sales: number) => {
    for (let i = TIER_SYSTEM.length - 1; i >= 0; i--) {
      if (sales >= TIER_SYSTEM[i].minSales) {
        setCurrentTier(TIER_SYSTEM[i].name);
        break;
      }
    }
  };

  const getCurrentTierIndex = () => TIER_SYSTEM.findIndex((t) => t.name === currentTier);
  const currentTierIndex = getCurrentTierIndex();
  const nextTier = currentTierIndex < TIER_SYSTEM.length - 1 ? TIER_SYSTEM[currentTierIndex + 1] : null;
  const salesForNextTier = nextTier ? nextTier.minSales - totalSales : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Seller Tiers & Commissions</h1>

      {/* Current Tier Card */}
      <div className={`${TIER_SYSTEM[currentTierIndex].color} rounded-lg p-8 mb-12 border-4 border-gray-800`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold mb-2">
              {TIER_SYSTEM[currentTierIndex].emoji} {currentTier}
            </h2>
            <p className="text-lg font-bold">Commission: {TIER_SYSTEM[currentTierIndex].commission}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 mb-2">Total Sales</p>
            <p className="text-4xl font-bold">${totalSales.toFixed(2)}</p>
          </div>
        </div>

        {nextTier && (
          <div className="mt-6 pt-6 border-t border-gray-300">
            <p className="text-sm font-bold mb-2">Progress to {nextTier.name}</p>
            <div className="w-full bg-gray-300 h-3 rounded-full overflow-hidden">
              <div
                className="bg-green-600 h-full transition-all"
                style={{
                  width: `${((totalSales - TIER_SYSTEM[currentTierIndex].minSales) / (nextTier.minSales - TIER_SYSTEM[currentTierIndex].minSales)) * 100}%`,
                }}
              ></div>
            </div>
            <p className="text-sm mt-2">
              {salesForNextTier > 0 ? `Earn $${salesForNextTier.toFixed(2)} more to reach ${nextTier.name}` : "You've reached the highest tier!"}
            </p>
          </div>
        )}
      </div>

      {/* Tier Roadmap */}
      <h2 className="text-2xl font-bold mb-6">Tier Roadmap</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TIER_SYSTEM.map((tier, idx) => (
          <div
            key={tier.name}
            className={`${tier.color} rounded-lg p-6 border-2 ${
              tier.name === currentTier ? "border-yellow-500 shadow-lg" : "border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{tier.emoji} {tier.name}</h3>
              {tier.name === currentTier && <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">Current</span>}
            </div>
            <p className="text-lg font-bold mb-2">Commission: {tier.commission}</p>
            <p className="text-sm text-gray-600">Min. Sales: ${tier.minSales.toFixed(2)}</p>
            {idx < currentTierIndex && <p className="text-green-600 font-bold mt-2">? Unlocked</p>}
          </div>
        ))}
      </div>

      {/* Perks */}
      <h2 className="text-2xl font-bold mt-12 mb-6">Tier Perks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
          <h3 className="font-bold mb-2">Higher Commission</h3>
          <p className="text-gray-700">Earn more on every sale as you level up tiers</p>
        </div>
        <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-600">
          <h3 className="font-bold mb-2">Priority Support</h3>
          <p className="text-gray-700">Faster response times from our support team at higher tiers</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-600">
          <h3 className="font-bold mb-2">Featured Products</h3>
          <p className="text-gray-700">Top-tier sellers get featured placement on the platform</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-600">
          <h3 className="font-bold mb-2">Marketing Tools</h3>
          <p className="text-gray-700">Access advanced analytics and marketing features</p>
        </div>
      </div>
    </div>
  );
}
