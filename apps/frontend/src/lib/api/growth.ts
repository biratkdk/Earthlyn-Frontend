import apiClient from "@/lib/api/client";
import type {
  ApiCategoryAnalytics,
  ApiDashboardAnalytics,
  ApiEcoImpactAnalytics,
  ApiGrowthSummary,
  ApiMarketingCampaign,
  ApiProduct,
  ApiProductAnalytics,
  ApiReferral,
  ApiReferralAnalytics,
  ApiRetentionAnalytics,
  ApiRevenueTrendAnalytics,
  ApiSubscription,
  ApiSubscriptionAnalytics,
  ApiSubscriptionPlan,
  ApiTopSellerAnalytics,
  ApiUserGrowthAnalytics,
} from "@/lib/types/api";
import type { PaginatedResponse } from "@/lib/api/pagination";

export const BUYER_SUBSCRIPTION_PLANS = [
  {
    value: "SEED_BOX",
    name: "Seed Box",
    price: "$18",
    cadence: "monthly",
    summary: "Starter swaps for low-waste household habits.",
    benefits: [
      "3 curated essentials",
      "Entry eco-point boosts",
      "Cancel anytime",
    ],
  },
  {
    value: "BLOOM_BOX",
    name: "Bloom Box",
    price: "$34",
    cadence: "monthly",
    summary: "A balanced box for recurring pantry and personal-care upgrades.",
    benefits: [
      "5 premium products",
      "Priority recommendations",
      "Higher reward velocity",
    ],
  },
  {
    value: "EVERGREEN_BOX",
    name: "Evergreen Box",
    price: "$58",
    cadence: "monthly",
    summary:
      "High-impact discovery for buyers replacing more of their routine.",
    benefits: [
      "8+ curated products",
      "Early access picks",
      "Top eco-point multiplier",
    ],
  },
] as const;

export type BuyerSubscriptionPlan = (typeof BUYER_SUBSCRIPTION_PLANS)[number];

export type AdminAnalyticsRange = "all" | "7" | "30" | "90";
export type MarketingAudience = "ALL" | "BUYERS" | "SELLERS";
export type MarketingCampaignStatus = "ALL" | "DRAFT" | "SENT";
export type ReferralStatus = "PENDING" | "COMPLETED" | "CANCELLED";
export type ReferralStatusFilter = "ALL" | ReferralStatus;

export interface AdminGrowthListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  audience?: string;
}

export interface CreateMarketingCampaignPayload {
  title: string;
  message: string;
  audience: MarketingAudience;
  sendNow?: boolean;
}

export interface UpdateReferralStatusPayload {
  status: ReferralStatus;
  rewardPoints?: number;
}

export interface CreateSubscriptionPlanPayload {
  code: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  benefits: string[];
  stripePriceId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateSubscriptionPlanPayload =
  Partial<Omit<CreateSubscriptionPlanPayload, "code" | "stripePriceId">> & {
    stripePriceId?: string | null;
  };

function rangeQuery(range: AdminAnalyticsRange) {
  return range === "all" ? "" : `?days=${range}`;
}

export async function getMyReferrals(page: number, pageSize: number) {
  const { data } = await apiClient.get(
    `/referrals/my?page=${page}&pageSize=${pageSize}`,
  );
  return data;
}

export async function createReferral(refereeEmail: string) {
  const { data } = await apiClient.post<ApiReferral>("/referrals", {
    refereeEmail,
  });
  return data;
}

export async function getMySubscriptions(page: number, pageSize: number) {
  const { data } = await apiClient.get(
    `/subscriptions/my?page=${page}&pageSize=${pageSize}`,
  );
  return data;
}

export async function createSubscription(plan: string) {
  const { data } = await apiClient.post<ApiSubscription>("/subscriptions", {
    plan,
  });
  return data;
}

export async function cancelSubscription(id: string) {
  const { data } = await apiClient.patch<ApiSubscription>(
    `/subscriptions/${id}/cancel`,
  );
  return data;
}

export async function getRecommendations(limit = 6) {
  const { data } = await apiClient.get<ApiProduct[]>(
    `/products/recommendations?limit=${limit}`,
  );
  return data || [];
}

export const adminGrowthApi = {
  summary: () => apiClient.get<ApiGrowthSummary>("/admin/growth/summary"),
  campaigns: (query: AdminGrowthListQuery) => {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.audience) params.set("audience", query.audience);

    return apiClient.get<PaginatedResponse<ApiMarketingCampaign>>(
      `/admin/growth/campaigns?${params.toString()}`,
    );
  },
  createCampaign: (payload: CreateMarketingCampaignPayload) =>
    apiClient.post<ApiMarketingCampaign>("/admin/growth/campaigns", payload),
  sendCampaign: (id: string) =>
    apiClient.post<ApiMarketingCampaign>(`/admin/growth/campaigns/${id}/send`),
  referrals: (query: AdminGrowthListQuery) => {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);

    return apiClient.get<PaginatedResponse<ApiReferral>>(
      `/admin/growth/referrals?${params.toString()}`,
    );
  },
  updateReferralStatus: (id: string, payload: UpdateReferralStatusPayload) =>
    apiClient.patch<ApiReferral>(`/admin/growth/referrals/${id}/status`, payload),
  subscriptionPlans: (query: Pick<AdminGrowthListQuery, "page" | "pageSize">) =>
    apiClient.get<PaginatedResponse<ApiSubscriptionPlan>>(
      `/admin/growth/subscription-plans?page=${query.page}&pageSize=${query.pageSize}`,
    ),
  createSubscriptionPlan: (payload: CreateSubscriptionPlanPayload) =>
    apiClient.post<ApiSubscriptionPlan>(
      "/admin/growth/subscription-plans",
      payload,
    ),
  updateSubscriptionPlan: (id: string, payload: UpdateSubscriptionPlanPayload) =>
    apiClient.patch<ApiSubscriptionPlan>(
      `/admin/growth/subscription-plans/${id}`,
      payload,
    ),
  dashboard: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiDashboardAnalytics>(
      `/admin/analytics/dashboard${rangeQuery(range)}`,
    ),
  ecoImpact: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiEcoImpactAnalytics>(
      `/admin/analytics/eco-impact${rangeQuery(range)}`,
    ),
  referralAnalytics: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiReferralAnalytics>(
      `/admin/analytics/referrals${rangeQuery(range)}`,
    ),
  subscriptions: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiSubscriptionAnalytics>(
      `/admin/analytics/subscriptions${rangeQuery(range)}`,
    ),
  retention: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiRetentionAnalytics>(
      `/admin/analytics/retention${rangeQuery(range)}`,
    ),
  categories: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiCategoryAnalytics[]>(
      `/admin/analytics/categories${rangeQuery(range)}`,
    ),
  products: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiProductAnalytics>(
      `/admin/analytics/products${rangeQuery(range)}`,
    ),
  userGrowth: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiUserGrowthAnalytics>(
      `/admin/analytics/user-growth${rangeQuery(range)}`,
    ),
  revenueTrends: (range: AdminAnalyticsRange) =>
    apiClient.get<ApiRevenueTrendAnalytics>(
      `/admin/analytics/revenue-trends${rangeQuery(range)}`,
    ),
  topSellers: (range: AdminAnalyticsRange) => {
    const separator = range === "all" ? "?" : "&";
    return apiClient.get<ApiTopSellerAnalytics[]>(
      `/admin/analytics/top-sellers${rangeQuery(range)}${separator}limit=5`,
    );
  },
};
