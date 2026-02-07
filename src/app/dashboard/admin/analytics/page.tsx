"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [eco, setEco] = useState<any>(null);
  const [referrals, setReferrals] = useState<any>(null);
  const [subs, setSubs] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    const [dash, ecoRes, ref, sub, ret, cat] = await Promise.all([
      apiClient.get("/admin/analytics/dashboard"),
      apiClient.get("/admin/analytics/eco-impact"),
      apiClient.get("/admin/analytics/referrals"),
      apiClient.get("/admin/analytics/subscriptions"),
      apiClient.get("/admin/analytics/retention"),
      apiClient.get("/admin/analytics/categories"),
    ]);
    setDashboard(dash.data);
    setEco(ecoRes.data);
    setReferrals(ref.data);
    setSubs(sub.data);
    setRetention(ret.data);
    setCategories(cat.data || []);
  };

  if (!dashboard) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">${Number(dashboard.totalRevenue || 0).toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{dashboard.totalOrders}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">{dashboard.totalUsers}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="card p-6">
          <h3 className="text-xl">Eco Impact</h3>
          <p className="text-gray-600 mt-2">Eco Products: {eco?.ecoFriendlyProducts}</p>
          <p className="text-gray-600">Carbon Saved: {eco?.carbonSaved}</p>
          <p className="text-gray-600">Trees Planted: {eco?.treesPlanted}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-xl">Retention</h3>
          <p className="text-gray-600 mt-2">Total Buyers: {retention?.totalBuyers}</p>
          <p className="text-gray-600">Repeat Buyers: {retention?.repeatBuyers}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="card p-6">
          <h3 className="text-xl">Referrals</h3>
          <p className="text-gray-600 mt-2">Total: {referrals?.total}</p>
          <p className="text-gray-600">Pending: {referrals?.pending}</p>
          <p className="text-gray-600">Completed: {referrals?.completed}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-xl">Subscriptions</h3>
          <p className="text-gray-600 mt-2">Active: {subs?.active}</p>
          <p className="text-gray-600">Cancelled: {subs?.cancelled}</p>
          <p className="text-gray-600">Expired: {subs?.expired}</p>
        </div>
      </div>

      <div className="card p-6 mt-8">
        <h3 className="text-xl">Top Categories</h3>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c: any) => (
            <div key={c.category} className="rounded-xl border border-black/10 p-4">
              <p className="font-semibold">{c.category}</p>
              <p className="text-sm text-gray-600">{c.count} products</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
