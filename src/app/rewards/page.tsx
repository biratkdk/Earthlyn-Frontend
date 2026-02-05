"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

const ECO_BADGES = [
  { name: "Green Warrior", requirement: 100, icon: "??", color: "bg-green-500" },
  { name: "Earth Protector", requirement: 250, icon: "??", color: "bg-blue-500" },
  { name: "Sustainability Champion", requirement: 500, icon: "??", color: "bg-yellow-500" },
  { name: "Carbon Neutral Hero", requirement: 1000, icon: "??", color: "bg-emerald-500" },
];

export default function EcoRewards() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [ecoPoints, setEcoPoints] = useState(0);
  const [co2Saved, setCO2Saved] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchRewards();
  }, [user]);

  const fetchRewards = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${user?.id}/eco-impact`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setEcoPoints(data.points || 0);
      setCO2Saved(data.co2Saved || 0);
    } catch (error) {
      console.error("Failed to fetch rewards:", error);
      // Mock data for demo
      setEcoPoints(342);
      setCO2Saved(145.8);
    } finally {
      setLoading(false);
    }
  };

  const unlockedBadges = ECO_BADGES.filter((b) => ecoPoints >= b.requirement);
  const nextBadge = ECO_BADGES.find((b) => ecoPoints < b.requirement);

  if (loading) return <div className="text-center py-20">Loading rewards...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-2">?? Eco Rewards</h1>
      <p className="text-gray-600 mb-8">Your impact on the planet</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg p-8">
          <p className="text-sm opacity-90">Total Eco Points</p>
          <p className="text-4xl font-bold">{ecoPoints}</p>
          <p className="text-sm mt-2">Points earned through sustainable choices</p>
        </div>
        <div className="bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg p-8">
          <p className="text-sm opacity-90">CO2 Saved</p>
          <p className="text-4xl font-bold">{co2Saved}kg</p>
          <p className="text-sm mt-2">Equivalent to planting {Math.floor(co2Saved / 20)} trees</p>
        </div>
        <div className="bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg p-8">
          <p className="text-sm opacity-90">Impact Level</p>
          <p className="text-4xl font-bold">
            {unlockedBadges.length === ECO_BADGES.length ? "?? Max" : `${unlockedBadges.length + 1}/${ECO_BADGES.length}`}
          </p>
          <p className="text-sm mt-2">Badges unlocked</p>
        </div>
      </div>

      {/* Badge Progress */}
      {nextBadge && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Next Badge: {nextBadge.icon} {nextBadge.name}</h2>
          <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-2">
            <div
              className="bg-green-500 h-full transition-all"
              style={{ width: `${(ecoPoints / nextBadge.requirement) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {nextBadge.requirement - ecoPoints} points to unlock!
          </p>
        </div>
      )}

      {/* Badges Grid */}
      <h2 className="text-2xl font-bold mb-6">Badges Earned</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {ECO_BADGES.map((badge) => {
          const isUnlocked = ecoPoints >= badge.requirement;
          return (
            <div
              key={badge.name}
              className={`rounded-lg p-6 text-center transition-all ${
                isUnlocked
                  ? `${badge.color} text-white shadow-lg`
                  : "bg-gray-200 text-gray-500 opacity-50"
              }`}
            >
              <p className="text-5xl mb-2">{badge.icon}</p>
              <p className="font-bold">{badge.name}</p>
              <p className="text-sm mt-2">{badge.requirement} pts</p>
              {isUnlocked && <p className="text-xs mt-2">? Unlocked</p>}
            </div>
          );
        })}
      </div>

      {/* How It Works */}
      <div className="bg-green-50 rounded-lg p-8 border-l-4 border-green-600">
        <h2 className="text-2xl font-bold mb-4">How to Earn Points</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-2xl">???</span>
            <div>
              <p className="font-bold">Every Purchase</p>
              <p className="text-sm text-gray-600">Earn points equal to 5% of your order value</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-2xl">??</span>
            <div>
              <p className="font-bold">Eco Products</p>
              <p className="text-sm text-gray-600">Buy certified biodegradable items for 2x points</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-2xl">??</span>
            <div>
              <p className="font-bold">Referrals</p>
              <p className="text-sm text-gray-600">Invite friends and earn 50 bonus points per sign-up</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-2xl">?</span>
            <div>
              <p className="font-bold">Reviews</p>
              <p className="text-sm text-gray-600">Leave detailed reviews for 10 points per review</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
