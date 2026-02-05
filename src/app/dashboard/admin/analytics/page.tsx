"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

interface Analytics { totalUsers: number; totalRevenue: number; avgOrderValue: number; }

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Analytics>({ totalUsers: 0, totalRevenue: 0, avgOrderValue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const { data } = await apiClient.get("/admin/analytics/dashboard");
      setStats(data || {});
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "admin") return <div className="p-8 text-red-600">Admin only</div>;
  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Total Users</p>
          <p className="text-4xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Total Revenue</p>
          <p className="text-4xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Avg Order Value</p>
          <p className="text-4xl font-bold text-purple-600">${stats.avgOrderValue.toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Sales Trends</h2>
        <div className="h-64 flex items-end justify-around">
          {[30, 45, 35, 60, 50, 70, 65].map((h, i) => (
            <div key={i} className="bg-green-500 rounded-t" style={{ width: "12%", height: `${h * 3}px` }}></div>
          ))}
        </div>
      </div>
    </div>
  );
}
