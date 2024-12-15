"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { LoadingState } from "@/components/ui/Skeleton";
import { getErrorMessage } from "@/lib/utils/errors";
import { adminGrowthApi, type AdminAnalyticsRange } from "@/lib/api/growth";
import type {
  ApiCategoryAnalytics,
  ApiDashboardAnalytics,
  ApiEcoImpactAnalytics,
  ApiReferralAnalytics,
  ApiRetentionAnalytics,
  ApiSubscriptionAnalytics,
  ApiTopSellerAnalytics,
} from "@/lib/types/api";

type AnalyticsSection =
  | "dashboard"
  | "eco"
  | "referrals"
  | "subscriptions"
  | "retention"
  | "categories"
  | "topSellers";

const SECTION_LABELS: Record<AnalyticsSection, string> = {
  dashboard: "dashboard metrics",
  eco: "eco impact",
  referrals: "referrals",
  subscriptions: "subscriptions",
  retention: "retention",
  categories: "categories",
  topSellers: "top sellers",
};

const RANGE_OPTIONS = [
  { label: "All time", value: "all" as const },
  { label: "Last 7 days", value: "7" as const },
  { label: "Last 30 days", value: "30" as const },
  { label: "Last 90 days", value: "90" as const },
];

function BarChart({
  title,
  values,
}: {
  title: string;
  values: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...values.map((item) => item.value), 1);

  return (
    <div className="mt-4 space-y-3" role="img" aria-label={title}>
      {values.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-semibold">{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ApiDashboardAnalytics | null>(null);
  const [eco, setEco] = useState<ApiEcoImpactAnalytics | null>(null);
  const [referrals, setReferrals] = useState<ApiReferralAnalytics | null>(null);
  const [subs, setSubs] = useState<ApiSubscriptionAnalytics | null>(null);
  const [retention, setRetention] = useState<ApiRetentionAnalytics | null>(null);
  const [categories, setCategories] = useState<ApiCategoryAnalytics[]>([]);
  const [topSellers, setTopSellers] = useState<ApiTopSellerAnalytics[]>([]);
  const [sectionErrors, setSectionErrors] = useState<
    Partial<Record<AnalyticsSection, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<AdminAnalyticsRange>("all");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    let cancelled = false;

    const loadAnalytics = async () => {
      setLoading(true);
      setSectionErrors({});

      const requests = [
        {
          key: "dashboard" as const,
          promise: adminGrowthApi.dashboard(range),
        },
        {
          key: "eco" as const,
          promise: adminGrowthApi.ecoImpact(range),
        },
        {
          key: "referrals" as const,
          promise: adminGrowthApi.referralAnalytics(range),
        },
        {
          key: "subscriptions" as const,
          promise: adminGrowthApi.subscriptions(range),
        },
        {
          key: "retention" as const,
          promise: adminGrowthApi.retention(range),
        },
        {
          key: "categories" as const,
          promise: adminGrowthApi.categories(range),
        },
        {
          key: "topSellers" as const,
          promise: adminGrowthApi.topSellers(range),
        },
      ];

      const settled = await Promise.allSettled(
        requests.map((request) => request.promise),
      );

      if (cancelled) return;

      const errors: Partial<Record<AnalyticsSection, string>> = {};

      settled.forEach((result, index) => {
        const key = requests[index].key;

        if (result.status === "rejected") {
          errors[key] = getErrorMessage(
            result.reason,
            `Failed to load ${SECTION_LABELS[key]}.`,
          );
          return;
        }

        const data = result.value.data;
        switch (key) {
          case "dashboard":
            setDashboard(data as ApiDashboardAnalytics);
            break;
          case "eco":
            setEco(data as ApiEcoImpactAnalytics);
            break;
          case "referrals":
            setReferrals(data as ApiReferralAnalytics);
            break;
          case "subscriptions":
            setSubs(data as ApiSubscriptionAnalytics);
            break;
          case "retention":
            setRetention(data as ApiRetentionAnalytics);
            break;
          case "categories":
            setCategories((data as ApiCategoryAnalytics[]) || []);
            break;
          case "topSellers":
            setTopSellers((data as ApiTopSellerAnalytics[]) || []);
            break;
        }
      });

      setSectionErrors(errors);
      setLoading(false);
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, user, router, range, retryKey]);

  if (!isHydrated || loading) return <LoadingState rows={4} />;

  const dashboardData = dashboard || {};
  const ecoData = eco || {};
  const referralData = referrals || {};
  const subscriptionData = subs || {};
  const retentionData = retention || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl">Analytics</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-range" className="text-sm text-gray-600">
            Range
          </label>
          <select
            id="analytics-range"
            value={range}
            onChange={(event) =>
              setRange(event.target.value as AdminAnalyticsRange)
            }
            className="rounded-xl border border-black/10 px-3 py-2"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {Object.entries(sectionErrors).length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Some analytics sections could not be loaded. Available metrics are
            still shown below.
          </span>
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="rounded-full border border-amber-300 px-3 py-1 font-semibold"
          >
            Retry failed sections
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Revenue</p>
          {sectionErrors.dashboard && (
            <p className="mt-2 text-sm text-red-700">{sectionErrors.dashboard}</p>
          )}
          <p className="text-3xl font-semibold text-[var(--accent)]">
            ${Number(dashboardData.totalRevenue || 0).toFixed(2)}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">
            {dashboardData.totalOrders || 0}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-3xl font-semibold text-[var(--accent)]">
            {dashboardData.totalUsers || 0}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="card p-6">
          <h3 className="text-xl">Eco Impact</h3>
          {sectionErrors.eco && (
            <p className="mt-2 text-sm text-red-700">{sectionErrors.eco}</p>
          )}
          <BarChart
            title="Eco impact chart"
            values={[
              {
                label: "Eco Products",
                value: Number(ecoData.ecoFriendlyProducts || 0),
              },
              { label: "Carbon Saved", value: Number(ecoData.carbonSaved || 0) },
              { label: "Trees Planted", value: Number(ecoData.treesPlanted || 0) },
            ]}
          />
        </div>
        <div className="card p-6">
          <h3 className="text-xl">Retention</h3>
          {sectionErrors.retention && (
            <p className="mt-2 text-sm text-red-700">
              {sectionErrors.retention}
            </p>
          )}
          <BarChart
            title="Buyer retention chart"
            values={[
              {
                label: "Total Buyers",
                value: Number(retentionData.totalBuyers || 0),
              },
              {
                label: "Repeat Buyers",
                value: Number(retentionData.repeatBuyers || 0),
              },
            ]}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="card p-6">
          <h3 className="text-xl">Referrals</h3>
          {sectionErrors.referrals && (
            <p className="mt-2 text-sm text-red-700">
              {sectionErrors.referrals}
            </p>
          )}
          <BarChart
            title="Referral status chart"
            values={[
              { label: "Total", value: Number(referralData.total || 0) },
              { label: "Pending", value: Number(referralData.pending || 0) },
              { label: "Completed", value: Number(referralData.completed || 0) },
            ]}
          />
        </div>
        <div className="card p-6">
          <h3 className="text-xl">Subscriptions</h3>
          {sectionErrors.subscriptions && (
            <p className="mt-2 text-sm text-red-700">
              {sectionErrors.subscriptions}
            </p>
          )}
          <BarChart
            title="Subscription status chart"
            values={[
              { label: "Active", value: Number(subscriptionData.active || 0) },
              {
                label: "Cancelled",
                value: Number(subscriptionData.cancelled || 0),
              },
              { label: "Expired", value: Number(subscriptionData.expired || 0) },
            ]}
          />
        </div>
      </div>

      <div className="card p-6 mt-8">
        <h3 className="text-xl">Top Categories</h3>
        {sectionErrors.categories && (
          <p className="mt-2 text-sm text-red-700">
            {sectionErrors.categories}
          </p>
        )}
        {categories.length === 0 ? (
          <p className="mt-4 text-gray-500">No category data available.</p>
        ) : (
          <BarChart
            title="Top categories chart"
            values={categories.map((category) => ({
              label: category.category,
              value: Number(category.count || 0),
            }))}
          />
        )}
      </div>

      <div className="card p-6 mt-8">
        <h3 className="text-xl">Top Sellers</h3>
        {sectionErrors.topSellers && (
          <p className="mt-2 text-sm text-red-700">{sectionErrors.topSellers}</p>
        )}
        {topSellers.length === 0 ? (
          <p className="mt-4 text-gray-500">No seller data available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Seller</th>
                  <th className="px-4 py-3 text-left">Tier</th>
                  <th className="px-4 py-3 text-left">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((seller, index) => (
                  <tr key={seller.id} className="border-b">
                    <td className="px-4 py-3 font-semibold text-[var(--accent)]">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{seller.user?.name || "Seller"}</p>
                      <p className="text-xs text-gray-500">{seller.user?.email || seller.userId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge">{(seller.tier || "SEED").replaceAll("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--accent)]">
                      ${Number(seller.totalSales || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
