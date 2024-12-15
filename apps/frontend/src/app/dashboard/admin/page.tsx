"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import { LoadingState, Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { getErrorMessage } from "@/lib/utils/errors";

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalSellers: number;
  totalTransactions: number;
}

const ADMIN_LINKS = [
  { href: "/dashboard/admin/products", label: "Product Approval" },
  { href: "/dashboard/admin/kyc", label: "KYC Review" },
  { href: "/dashboard/admin/tiers", label: "Seller Tiers" },
  { href: "/dashboard/admin/balance", label: "Balance Management" },
  { href: "/dashboard/admin/operations", label: "Operations" },
  { href: "/dashboard/admin/growth", label: "Growth Controls" },
  { href: "/dashboard/admin/disputes", label: "Disputes" },
  { href: "/dashboard/admin/refunds", label: "Refunds" },
  { href: "/dashboard/admin/analytics", label: "Analytics" },
  { href: "/dashboard/admin/audit-logs", label: "Audit Logs" },
  { href: "/dashboard/admin/moderation", label: "Moderation" },
  { href: "/dashboard/customer-service", label: "Support Tickets" },
];
const ADMIN_STAT_SKELETON_KEYS = [
  "total-users",
  "total-orders",
  "total-sellers",
  "total-transactions",
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    totalSellers: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/admin/stats");
      setStats(
        data || {
          totalUsers: 0,
          totalOrders: 0,
          totalSellers: 0,
          totalTransactions: 0,
        },
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to fetch admin stats."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push("/login");
      return;
    }
    void fetchStats();
  }, [user, isHydrated, router, fetchStats]);

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl">Admin Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          {ADMIN_STAT_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <ErrorState className="mt-8" message={error} onRetry={fetchStats} />
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
              <p className="text-3xl font-semibold text-[var(--accent)]">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="btn-secondary text-center"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
