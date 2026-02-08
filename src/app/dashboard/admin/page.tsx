"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalSellers: number;
  totalTransactions: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalOrders: 0, totalSellers: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchStats();
  }, [user, isHydrated]);

  const fetchStats = async () => {
    try {
      const { data } = await apiClient.get("/admin/stats");
      setStats(data || stats);
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  
  if (!isHydrated) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Admin Dashboard</h1>

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          {[
            { label: "Total Users", value: stats.totalUsers },
            { label: "Total Orders", value: stats.totalOrders },
            { label: "Total Sellers", value: stats.totalSellers },
            { label: "Transactions", value: stats.totalTransactions },
          ].map((card) => (
            <div key={card.label} className="card p-6">
              <p className="text-sm text-gray-600">{card.label}</p>
              <p className="text-3xl font-semibold text-[var(--accent)]">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



