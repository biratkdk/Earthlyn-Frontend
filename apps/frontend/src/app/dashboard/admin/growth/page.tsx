"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminGrowthApi,
  type AdminAnalyticsRange,
  type MarketingAudience,
  type MarketingCampaignStatus,
  type ReferralStatus,
  type ReferralStatusFilter,
} from "@/lib/api/growth";
import {
  getPaginatedItems,
  getPaginationMeta,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { useAuthStore } from "@/lib/store/auth";
import type {
  ApiCategoryAnalytics,
  ApiDashboardAnalytics,
  ApiEcoImpactAnalytics,
  ApiGrowthSummary,
  ApiMarketingCampaign,
  ApiProductAnalytics,
  ApiReferral,
  ApiReferralAnalytics,
  ApiRetentionAnalytics,
  ApiRevenueTrendAnalytics,
  ApiSubscriptionAnalytics,
  ApiSubscriptionPlan,
  ApiTopSellerAnalytics,
  ApiUserGrowthAnalytics,
} from "@/lib/types/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { LoadingState } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errors";

const RANGE_OPTIONS: Array<{ label: string; value: AdminAnalyticsRange }> = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];
const CAMPAIGN_PAGE_SIZE = 5;
const REFERRAL_PAGE_SIZE = 5;
const PLAN_PAGE_SIZE = 5;
const AUDIENCE_OPTIONS: MarketingAudience[] = ["ALL", "BUYERS", "SELLERS"];
const CAMPAIGN_STATUS_OPTIONS: MarketingCampaignStatus[] = [
  "ALL",
  "DRAFT",
  "SENT",
];
const REFERRAL_STATUS_OPTIONS: ReferralStatusFilter[] = [
  "ALL",
  "PENDING",
  "COMPLETED",
  "CANCELLED",
];
const REFERRAL_MUTATION_STATUSES: ReferralStatus[] = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
];
const INTERVAL_OPTIONS = ["MONTHLY", "QUARTERLY", "ANNUAL"] as const;

interface GrowthState {
  dashboard: ApiDashboardAnalytics;
  eco: ApiEcoImpactAnalytics;
  referrals: ApiReferralAnalytics;
  subscriptions: ApiSubscriptionAnalytics;
  retention: ApiRetentionAnalytics;
  products: ApiProductAnalytics;
  userGrowth: ApiUserGrowthAnalytics;
  revenue: ApiRevenueTrendAnalytics;
  categories: ApiCategoryAnalytics[];
  topSellers: ApiTopSellerAnalytics[];
}

interface PlanFormState {
  code: string;
  name: string;
  description: string;
  price: string;
  interval: string;
  benefits: string;
  stripePriceId: string;
  isActive: boolean;
  sortOrder: string;
}

interface CampaignFormState {
  title: string;
  message: string;
  audience: MarketingAudience;
  sendNow: boolean;
}

const EMPTY_GROWTH_STATE: GrowthState = {
  dashboard: {},
  eco: {},
  referrals: {},
  subscriptions: {},
  retention: {},
  products: {},
  userGrowth: {},
  revenue: {},
  categories: [],
  topSellers: [],
};

const EMPTY_PLAN_FORM: PlanFormState = {
  code: "",
  name: "",
  description: "",
  price: "",
  interval: "MONTHLY",
  benefits: "",
  stripePriceId: "",
  isActive: true,
  sortOrder: "100",
};

function formatCurrency(value?: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function metricValue(value?: number | string) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatStatus(value?: string) {
  return (value || "-").replaceAll("_", " ");
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-600">{detail}</p>
    </div>
  );
}

function BarList({
  title,
  values,
}: {
  title: string;
  values: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...values.map((item) => item.value), 1);

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {values.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between gap-4 text-sm">
              <span>{item.label}</span>
              <span className="font-semibold">
                {item.value.toLocaleString()}
              </span>
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
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

function InlineError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  if (!message) return null;
  return <ErrorState className="mt-4" message={message} onRetry={onRetry} />;
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || "").toUpperCase();
  const className =
    normalized === "SENT" || normalized === "COMPLETED" || normalized === "ACTIVE"
      ? "badge"
      : normalized === "CANCELLED" || normalized === "INACTIVE"
        ? "badge-danger"
        : "badge-warning";

  return <span className={className}>{formatStatus(status)}</span>;
}

export default function AdminGrowthPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const { notify } = useToast();
  const [range, setRange] = useState<AdminAnalyticsRange>("30");
  const [growth, setGrowth] = useState<GrowthState>(EMPTY_GROWTH_STATE);
  const [summary, setSummary] = useState<ApiGrowthSummary | null>(null);
  const [campaigns, setCampaigns] = useState<ApiMarketingCampaign[]>([]);
  const [referrals, setReferrals] = useState<ApiReferral[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    ApiSubscriptionPlan[]
  >([]);
  const [campaignMeta, setCampaignMeta] = useState<PaginationMeta | null>(null);
  const [referralMeta, setReferralMeta] = useState<PaginationMeta | null>(null);
  const [planMeta, setPlanMeta] = useState<PaginationMeta | null>(null);
  const [campaignPage, setCampaignPage] = useState(1);
  const [referralPage, setReferralPage] = useState(1);
  const [planPage, setPlanPage] = useState(1);
  const [campaignStatus, setCampaignStatus] =
    useState<MarketingCampaignStatus>("ALL");
  const [campaignAudience, setCampaignAudience] =
    useState<MarketingAudience>("ALL");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [referralStatus, setReferralStatus] =
    useState<ReferralStatusFilter>("ALL");
  const [referralSearch, setReferralSearch] = useState("");
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>({
    title: "",
    message: "",
    audience: "ALL",
    sendNow: false,
  });
  const [referralDrafts, setReferralDrafts] = useState<
    Record<string, { status: ReferralStatus; rewardPoints: string }>
  >({});
  const [planForm, setPlanForm] = useState<PlanFormState>(EMPTY_PLAN_FORM);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [campaignToSend, setCampaignToSend] =
    useState<ApiMarketingCampaign | null>(null);
  const [campaignToCreate, setCampaignToCreate] =
    useState<CampaignFormState | null>(null);
  const [planToToggle, setPlanToToggle] = useState<ApiSubscriptionPlan | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [campaignError, setCampaignError] = useState("");
  const [referralError, setReferralError] = useState("");
  const [planError, setPlanError] = useState("");
  const [campaignAction, setCampaignAction] = useState("");
  const [referralAction, setReferralAction] = useState("");
  const [planAction, setPlanAction] = useState("");

  const loadAnalytics = useCallback(async () => {
    setAnalyticsError("");

    const requests = {
      summary: adminGrowthApi.summary(),
      dashboard: adminGrowthApi.dashboard(range),
      eco: adminGrowthApi.ecoImpact(range),
      referrals: adminGrowthApi.referralAnalytics(range),
      subscriptions: adminGrowthApi.subscriptions(range),
      retention: adminGrowthApi.retention(range),
      products: adminGrowthApi.products(range),
      userGrowth: adminGrowthApi.userGrowth(range),
      revenue: adminGrowthApi.revenueTrends(range),
      categories: adminGrowthApi.categories(range),
      topSellers: adminGrowthApi.topSellers(range),
    };

    const entries = await Promise.allSettled(
      Object.entries(requests).map(async ([key, promise]) => ({
        key,
        data: (await promise).data,
      })),
    );

    const nextGrowth: GrowthState = { ...EMPTY_GROWTH_STATE };
    const failures: string[] = [];

    entries.forEach((entry) => {
      if (entry.status === "rejected") {
        failures.push(getErrorMessage(entry.reason, "Growth metric failed."));
        return;
      }

      const { key, data } = entry.value;
      if (key === "summary") {
        setSummary(data as ApiGrowthSummary);
      } else {
        nextGrowth[key as keyof GrowthState] = data as never;
      }
    });

    setGrowth(nextGrowth);
    if (failures.length > 0) {
      setAnalyticsError("Some growth metrics could not be loaded.");
    }
  }, [range]);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    setCampaignError("");
    try {
      const { data } = await adminGrowthApi.campaigns({
        page: campaignPage,
        pageSize: CAMPAIGN_PAGE_SIZE,
        search: campaignSearch.trim() || undefined,
        status: campaignStatus,
        audience: campaignAudience,
      });
      setCampaigns(getPaginatedItems<ApiMarketingCampaign>(data));
      setCampaignMeta(getPaginationMeta<ApiMarketingCampaign>(data));
    } catch (error) {
      setCampaignError(getErrorMessage(error, "Failed to load campaigns."));
    } finally {
      setLoadingCampaigns(false);
    }
  }, [campaignAudience, campaignPage, campaignSearch, campaignStatus]);

  const loadReferrals = useCallback(async () => {
    setLoadingReferrals(true);
    setReferralError("");
    try {
      const { data } = await adminGrowthApi.referrals({
        page: referralPage,
        pageSize: REFERRAL_PAGE_SIZE,
        search: referralSearch.trim() || undefined,
        status: referralStatus,
      });
      const nextReferrals = getPaginatedItems<ApiReferral>(data);
      setReferrals(nextReferrals);
      setReferralMeta(getPaginationMeta<ApiReferral>(data));
      setReferralDrafts((current) => {
        const next = { ...current };
        nextReferrals.forEach((referral) => {
          if (!next[referral.id]) {
            next[referral.id] = {
              status: (referral.status || "PENDING") as ReferralStatus,
              rewardPoints: "250",
            };
          }
        });
        return next;
      });
    } catch (error) {
      setReferralError(getErrorMessage(error, "Failed to load referrals."));
    } finally {
      setLoadingReferrals(false);
    }
  }, [referralPage, referralSearch, referralStatus]);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setPlanError("");
    try {
      const { data } = await adminGrowthApi.subscriptionPlans({
        page: planPage,
        pageSize: PLAN_PAGE_SIZE,
      });
      setSubscriptionPlans(getPaginatedItems<ApiSubscriptionPlan>(data));
      setPlanMeta(getPaginationMeta<ApiSubscriptionPlan>(data));
    } catch (error) {
      setPlanError(
        getErrorMessage(error, "Failed to load subscription plans."),
      );
    } finally {
      setLoadingPlans(false);
    }
  }, [planPage]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    setLoading(false);
  }, [isHydrated, router, user]);

  useEffect(() => {
    if (!isHydrated || user?.role !== "ADMIN") return;
    void loadAnalytics();
  }, [isHydrated, loadAnalytics, user?.role]);

  useEffect(() => {
    if (!isHydrated || user?.role !== "ADMIN") return;
    void loadCampaigns();
  }, [isHydrated, loadCampaigns, user?.role]);

  useEffect(() => {
    if (!isHydrated || user?.role !== "ADMIN") return;
    void loadReferrals();
  }, [isHydrated, loadReferrals, user?.role]);

  useEffect(() => {
    if (!isHydrated || user?.role !== "ADMIN") return;
    void loadPlans();
  }, [isHydrated, loadPlans, user?.role]);

  const referralConversion = useMemo(() => {
    const total = Number(growth.referrals.total ?? summary?.referrals.total ?? 0);
    const completed = Number(
      growth.referrals.completed ?? summary?.referrals.completed ?? 0,
    );
    return total ? (completed / total) * 100 : 0;
  }, [
    growth.referrals.completed,
    growth.referrals.total,
    summary?.referrals.completed,
    summary?.referrals.total,
  ]);

  const repeatRate = useMemo(() => {
    const total = Number(growth.retention.totalBuyers ?? 0);
    const repeat = Number(growth.retention.repeatBuyers ?? 0);
    return total ? (repeat / total) * 100 : 0;
  }, [growth.retention.repeatBuyers, growth.retention.totalBuyers]);

  const updatePlanForm = (patch: Partial<PlanFormState>) => {
    setPlanForm((current) => ({ ...current, ...patch }));
  };

  const resetPlanForm = () => {
    setEditingPlanId(null);
    setPlanForm(EMPTY_PLAN_FORM);
  };

  const startEditingPlan = (plan: ApiSubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price: String(plan.price),
      interval: plan.interval || "MONTHLY",
      benefits: (plan.benefits || []).join("\n"),
      stripePriceId: plan.stripePriceId || "",
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder ?? 100),
    });
  };

  const getValidatedCampaignDraft = () => {
    const title = campaignForm.title.trim();
    const message = campaignForm.message.trim();
    if (title.length < 3 || message.length < 10) {
      notify("Campaign title and message are too short.", "error");
      return null;
    }

    return {
      title,
      message,
      audience: campaignForm.audience,
      sendNow: campaignForm.sendNow,
    };
  };

  const requestCreateCampaign = () => {
    const draft = getValidatedCampaignDraft();
    if (!draft) return;

    if (draft.sendNow) {
      setCampaignToCreate(draft);
      return;
    }

    void createCampaign(draft);
  };

  const createCampaign = async (draft: CampaignFormState) => {
    setCampaignAction("create");
    try {
      const { data } = await adminGrowthApi.createCampaign({
        title: draft.title,
        message: draft.message,
        audience: draft.audience,
        sendNow: draft.sendNow,
      });
      notify(
        data.status === "SENT"
          ? "Campaign sent to eligible users."
          : "Campaign saved as draft.",
        "success",
      );
      setCampaignForm({
        title: "",
        message: "",
        audience: "ALL",
        sendNow: false,
      });
      setCampaignToCreate(null);
      setCampaignPage(1);
      await loadAnalytics();
      if (campaignPage === 1) {
        await loadCampaigns();
      }
    } catch (error) {
      notify(getErrorMessage(error, "Failed to save campaign."), "error");
    } finally {
      setCampaignAction("");
    }
  };

  const sendCampaign = async () => {
    if (!campaignToSend) return;

    setCampaignAction(`send:${campaignToSend.id}`);
    try {
      await adminGrowthApi.sendCampaign(campaignToSend.id);
      notify("Campaign sent.", "success");
      setCampaignToSend(null);
      await Promise.all([loadAnalytics(), loadCampaigns()]);
    } catch (error) {
      notify(getErrorMessage(error, "Failed to send campaign."), "error");
    } finally {
      setCampaignAction("");
    }
  };

  const updateReferral = async (referral: ApiReferral) => {
    const draft = referralDrafts[referral.id];
    if (!draft) return;

    const rewardPoints = Number(draft.rewardPoints || 0);
    if (!Number.isFinite(rewardPoints) || rewardPoints < 0) {
      notify("Reward points must be zero or higher.", "error");
      return;
    }

    setReferralAction(referral.id);
    try {
      await adminGrowthApi.updateReferralStatus(referral.id, {
        status: draft.status,
        rewardPoints: Math.trunc(rewardPoints),
      });
      notify("Referral status updated.", "success");
      await Promise.all([loadAnalytics(), loadReferrals()]);
    } catch (error) {
      notify(getErrorMessage(error, "Failed to update referral."), "error");
    } finally {
      setReferralAction("");
    }
  };

  const submitPlan = async () => {
    const price = Number(planForm.price);
    const sortOrder = Number(planForm.sortOrder || 100);
    const benefits = planForm.benefits
      .split(/\r?\n/)
      .map((benefit) => benefit.trim())
      .filter(Boolean);

    if (!editingPlanId && planForm.code.trim().length < 3) {
      notify("Plan code must be at least 3 characters.", "error");
      return;
    }
    if (
      planForm.name.trim().length < 3 ||
      planForm.description.trim().length < 10
    ) {
      notify("Plan name and description are too short.", "error");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      notify("Plan price must be zero or higher.", "error");
      return;
    }
    if (benefits.length === 0) {
      notify("Add at least one plan benefit.", "error");
      return;
    }

    setPlanAction(editingPlanId ? `save:${editingPlanId}` : "create");
    try {
      if (editingPlanId) {
        await adminGrowthApi.updateSubscriptionPlan(editingPlanId, {
          name: planForm.name.trim(),
          description: planForm.description.trim(),
          price,
          interval: planForm.interval,
          benefits,
          stripePriceId: planForm.stripePriceId.trim() || null,
          isActive: planForm.isActive,
          sortOrder: Math.trunc(sortOrder),
        });
        notify("Subscription plan updated.", "success");
      } else {
        await adminGrowthApi.createSubscriptionPlan({
          code: planForm.code.trim(),
          name: planForm.name.trim(),
          description: planForm.description.trim(),
          price,
          interval: planForm.interval,
          benefits,
          stripePriceId: planForm.stripePriceId.trim() || undefined,
          isActive: planForm.isActive,
          sortOrder: Math.trunc(sortOrder),
        });
        notify("Subscription plan created.", "success");
      }
      resetPlanForm();
      await Promise.all([loadAnalytics(), loadPlans()]);
    } catch (error) {
      notify(getErrorMessage(error, "Failed to save plan."), "error");
    } finally {
      setPlanAction("");
    }
  };

  const togglePlan = async () => {
    if (!planToToggle) return;

    setPlanAction(`toggle:${planToToggle.id}`);
    try {
      await adminGrowthApi.updateSubscriptionPlan(planToToggle.id, {
        isActive: !planToToggle.isActive,
      });
      notify(
        planToToggle.isActive
          ? "Subscription plan disabled."
          : "Subscription plan enabled.",
        "success",
      );
      setPlanToToggle(null);
      await Promise.all([loadAnalytics(), loadPlans()]);
    } catch (error) {
      notify(getErrorMessage(error, "Failed to update plan."), "error");
    } finally {
      setPlanAction("");
    }
  };

  if (!isHydrated || loading) return <LoadingState rows={5} />;

  const campaignTotal = campaignMeta?.totalItems ?? campaigns.length;
  const referralTotal = referralMeta?.totalItems ?? referrals.length;
  const planTotal = planMeta?.totalItems ?? subscriptionPlans.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/admin" className="btn-secondary inline-block">
            Back to Admin
          </Link>
          <h1 className="mt-6 text-4xl">Growth Controls</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Monitor growth signals and manage referral, campaign, and
            subscription-plan operations from live platform data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="growth-range" className="text-sm text-gray-600">
            Range
          </label>
          <select
            id="growth-range"
            value={range}
            onChange={(event) =>
              setRange(event.target.value as AdminAnalyticsRange)
            }
            className="rounded-xl border border-black/10 bg-white px-3 py-2"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {analyticsError && (
        <ErrorState
          className="mt-6"
          message={analyticsError}
          onRetry={() => void loadAnalytics()}
        />
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatCurrency(
            growth.revenue.totalRevenue ?? growth.dashboard.totalRevenue,
          )}
          detail={`${metricValue(growth.revenue.ordersCount ?? growth.dashboard.totalOrders)} orders in range`}
        />
        <MetricCard
          label="Referral Conversion"
          value={formatPercent(referralConversion)}
          detail={`${metricValue(growth.referrals.completed ?? summary?.referrals.completed)} completed of ${metricValue(growth.referrals.total ?? summary?.referrals.total)} referrals`}
        />
        <MetricCard
          label="Active Subscriptions"
          value={metricValue(
            growth.subscriptions.active ?? summary?.subscriptions.active,
          )}
          detail={`${metricValue(growth.subscriptions.cancelled ?? summary?.subscriptions.cancelled)} cancelled, ${metricValue(growth.subscriptions.expired ?? summary?.subscriptions.expired)} expired`}
        />
        <MetricCard
          label="Monthly Recurring Revenue"
          value={formatCurrency(summary?.subscriptions.monthlyRecurringRevenue)}
          detail={`${metricValue(summary?.campaigns.sent)} sent campaigns, ${metricValue(summary?.campaigns.draft)} drafts`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <BarList
          title="Referral Funnel"
          values={[
            {
              label: "Total",
              value: Number(growth.referrals.total ?? summary?.referrals.total ?? 0),
            },
            {
              label: "Pending",
              value: Number(
                growth.referrals.pending ?? summary?.referrals.pending ?? 0,
              ),
            },
            {
              label: "Completed",
              value: Number(
                growth.referrals.completed ?? summary?.referrals.completed ?? 0,
              ),
            },
          ]}
        />
        <BarList
          title="Subscription Health"
          values={[
            {
              label: "Active",
              value: Number(
                growth.subscriptions.active ?? summary?.subscriptions.active ?? 0,
              ),
            },
            {
              label: "Cancelled",
              value: Number(
                growth.subscriptions.cancelled ??
                  summary?.subscriptions.cancelled ??
                  0,
              ),
            },
            {
              label: "Expired",
              value: Number(
                growth.subscriptions.expired ??
                  summary?.subscriptions.expired ??
                  0,
              ),
            },
          ]}
        />
        <BarList
          title="Catalog Readiness"
          values={[
            { label: "Approved", value: Number(growth.products.approved ?? 0) },
            { label: "Pending", value: Number(growth.products.pending ?? 0) },
            { label: "Rejected", value: Number(growth.products.rejected ?? 0) },
          ]}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <h2 className="text-xl font-semibold">Recommendation Inputs</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-black/10 p-4">
              <p className="text-sm text-gray-600">Eco products</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">
                {metricValue(
                  growth.eco.ecoFriendlyProducts ??
                    summary?.recommendations.approvedProducts,
                )}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 p-4">
              <p className="text-sm text-gray-600">New buyers</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">
                {metricValue(growth.userGrowth.newUsers)}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 p-4">
              <p className="text-sm text-gray-600">Repeat buyers</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">
                {formatPercent(repeatRate)}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {growth.categories.length === 0 &&
            !summary?.recommendations.topCategories?.length ? (
              <p className="text-sm text-gray-500">No category data available.</p>
            ) : (
              (growth.categories.length > 0
                ? growth.categories
                : summary?.recommendations.topCategories || []
              )
                .slice(0, 5)
                .map((category) => (
                  <div
                    key={category.category}
                    className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3"
                  >
                    <span>{category.category}</span>
                    <span className="badge">{category.count}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold">Top Seller Supply</h2>
          <div className="mt-4 space-y-3">
            {growth.topSellers.length === 0 ? (
              <p className="text-sm text-gray-500">No seller data available.</p>
            ) : (
              growth.topSellers.map((seller) => (
                <div
                  key={seller.id}
                  className="rounded-lg border border-black/10 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {seller.user?.name || seller.id.slice(0, 8)}
                    </p>
                    <span className="badge">{seller.tier || "Tier n/a"}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {(seller.products || []).length} sampled products
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <section className="mt-8 card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            title="Marketing Campaigns"
            description="Draft or send promotional notifications to eligible buyers and sellers."
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={campaignSearch}
              onChange={(event) => {
                setCampaignPage(1);
                setCampaignSearch(event.target.value);
              }}
              placeholder="Search campaigns"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm"
            />
            <select
              value={campaignAudience}
              onChange={(event) => {
                setCampaignPage(1);
                setCampaignAudience(event.target.value as MarketingAudience);
              }}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
            <select
              value={campaignStatus}
              onChange={(event) => {
                setCampaignPage(1);
                setCampaignStatus(
                  event.target.value as MarketingCampaignStatus,
                );
              }}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {CAMPAIGN_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <InlineError message={campaignError} onRetry={loadCampaigns} />

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-black/10 p-4">
            <h3 className="font-semibold">Create Campaign</h3>
            <div className="mt-4 space-y-3">
              <input
                value={campaignForm.title}
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Campaign title"
                className="w-full rounded-xl border border-black/10 px-3 py-2"
              />
              <textarea
                value={campaignForm.message}
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Notification message"
                rows={5}
                className="w-full rounded-xl border border-black/10 px-3 py-2"
              />
              <select
                value={campaignForm.audience}
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    audience: event.target.value as MarketingAudience,
                  }))
                }
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatStatus(option)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={campaignForm.sendNow}
                  onChange={(event) =>
                    setCampaignForm((current) => ({
                      ...current,
                      sendNow: event.target.checked,
                    }))
                  }
                />
                Send immediately
              </label>
              <button
                type="button"
                onClick={requestCreateCampaign}
                disabled={campaignAction === "create"}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {campaignAction === "create" ? "Saving..." : "Save Campaign"}
              </button>
            </div>
          </div>

          <div>
            {loadingCampaigns ? (
              <LoadingState rows={3} />
            ) : campaigns.length === 0 ? (
              <p className="rounded-lg border border-black/10 p-4 text-sm text-gray-500">
                No campaigns match the current filters.
              </p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-lg border border-black/10 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{campaign.title}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {campaign.message}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {formatStatus(campaign.audience)} audience -
                          {" "}
                          {campaign.recipientCount || 0} recipients - Created{" "}
                          {formatDate(campaign.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={campaign.status} />
                        {campaign.status !== "SENT" && (
                          <button
                            type="button"
                            onClick={() => setCampaignToSend(campaign)}
                            disabled={
                              campaignAction === `send:${campaign.id}`
                            }
                            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Send
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {campaignMeta && (
              <PaginationControls
                currentPage={campaignPage}
                pageSize={CAMPAIGN_PAGE_SIZE}
                totalItems={campaignTotal}
                totalPages={campaignMeta.totalPages}
                itemLabel="campaigns"
                onPageChange={setCampaignPage}
              />
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            title="Referral Rewards"
            description="Review referral records and control completion status with optional eco-point rewards."
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={referralSearch}
              onChange={(event) => {
                setReferralPage(1);
                setReferralSearch(event.target.value);
              }}
              placeholder="Search users"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm"
            />
            <select
              value={referralStatus}
              onChange={(event) => {
                setReferralPage(1);
                setReferralStatus(event.target.value as ReferralStatusFilter);
              }}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {REFERRAL_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <InlineError message={referralError} onRetry={loadReferrals} />

        <div className="mt-5 overflow-x-auto">
          {loadingReferrals ? (
            <LoadingState rows={3} />
          ) : referrals.length === 0 ? (
            <p className="rounded-lg border border-black/10 p-4 text-sm text-gray-500">
              No referrals match the current filters.
            </p>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-gray-600">
                  <th className="py-3 pr-4">Referrer</th>
                  <th className="py-3 pr-4">Referee</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Reward</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => {
                  const draft = referralDrafts[referral.id] || {
                    status: (referral.status || "PENDING") as ReferralStatus,
                    rewardPoints: "250",
                  };
                  return (
                    <tr key={referral.id} className="border-b border-black/5">
                      <td className="py-4 pr-4">
                        <p className="font-semibold">
                          {referral.referrer?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {referral.referrer?.email || referral.referrerId}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="font-semibold">
                          {referral.referee?.name || "Pending user"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {referral.referee?.email || referral.refereeId}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setReferralDrafts((current) => ({
                              ...current,
                              [referral.id]: {
                                ...draft,
                                status: event.target.value as ReferralStatus,
                              },
                            }))
                          }
                          className="rounded-xl border border-black/10 bg-white px-3 py-2"
                        >
                          {REFERRAL_MUTATION_STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {formatStatus(option)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 pr-4">
                        <input
                          type="number"
                          min={0}
                          value={draft.rewardPoints}
                          onChange={(event) =>
                            setReferralDrafts((current) => ({
                              ...current,
                              [referral.id]: {
                                ...draft,
                                rewardPoints: event.target.value,
                              },
                            }))
                          }
                          className="w-24 rounded-xl border border-black/10 px-3 py-2"
                        />
                      </td>
                      <td className="py-4 pr-4">{formatDate(referral.createdAt)}</td>
                      <td className="py-4">
                        <button
                          type="button"
                          onClick={() => void updateReferral(referral)}
                          disabled={referralAction === referral.id}
                          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {referralAction === referral.id
                            ? "Saving..."
                            : "Update"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {referralMeta && (
          <PaginationControls
            currentPage={referralPage}
            pageSize={REFERRAL_PAGE_SIZE}
            totalItems={referralTotal}
            totalPages={referralMeta.totalPages}
            itemLabel="referrals"
            onPageChange={setReferralPage}
          />
        )}
      </section>

      <section className="mt-8 card p-6">
        <SectionHeader
          title="Subscription Plans"
          description="Create, edit, enable, and disable eco-box plans without a storefront redeploy."
        />

        <InlineError message={planError} onRetry={loadPlans} />

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-black/10 p-4">
            <h3 className="font-semibold">
              {editingPlanId ? "Edit Plan" : "Create Plan"}
            </h3>
            <div className="mt-4 grid gap-3">
              <input
                value={planForm.code}
                onChange={(event) => updatePlanForm({ code: event.target.value })}
                placeholder="PLAN_CODE"
                disabled={Boolean(editingPlanId)}
                className="rounded-xl border border-black/10 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
              />
              <input
                value={planForm.name}
                onChange={(event) => updatePlanForm({ name: event.target.value })}
                placeholder="Plan name"
                className="rounded-xl border border-black/10 px-3 py-2"
              />
              <textarea
                value={planForm.description}
                onChange={(event) =>
                  updatePlanForm({ description: event.target.value })
                }
                placeholder="Plan description"
                rows={3}
                className="rounded-xl border border-black/10 px-3 py-2"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={planForm.price}
                  onChange={(event) =>
                    updatePlanForm({ price: event.target.value })
                  }
                  placeholder="Price"
                  className="rounded-xl border border-black/10 px-3 py-2"
                />
                <select
                  value={planForm.interval}
                  onChange={(event) =>
                    updatePlanForm({ interval: event.target.value })
                  }
                  className="rounded-xl border border-black/10 bg-white px-3 py-2"
                >
                  {INTERVAL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatStatus(option)}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={planForm.benefits}
                onChange={(event) =>
                  updatePlanForm({ benefits: event.target.value })
                }
                placeholder="One benefit per line"
                rows={4}
                className="rounded-xl border border-black/10 px-3 py-2"
              />
              <input
                value={planForm.stripePriceId}
                onChange={(event) =>
                  updatePlanForm({ stripePriceId: event.target.value })
                }
                placeholder="Stripe price id"
                className="rounded-xl border border-black/10 px-3 py-2"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={0}
                  value={planForm.sortOrder}
                  onChange={(event) =>
                    updatePlanForm({ sortOrder: event.target.value })
                  }
                  placeholder="Sort order"
                  className="rounded-xl border border-black/10 px-3 py-2"
                />
                <label className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(event) =>
                      updatePlanForm({ isActive: event.target.checked })
                    }
                  />
                  Active
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitPlan()}
                  disabled={Boolean(planAction)}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {planAction === "create" || planAction.startsWith("save:")
                    ? "Saving..."
                    : editingPlanId
                      ? "Save Plan"
                      : "Create Plan"}
                </button>
                {editingPlanId && (
                  <button
                    type="button"
                    onClick={resetPlanForm}
                    className="btn-secondary"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            {loadingPlans ? (
              <LoadingState rows={3} />
            ) : subscriptionPlans.length === 0 ? (
              <p className="rounded-lg border border-black/10 p-4 text-sm text-gray-500">
                No subscription plans found.
              </p>
            ) : (
              <div className="space-y-3">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-black/10 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{plan.name}</p>
                          <StatusBadge
                            status={plan.isActive ? "ACTIVE" : "INACTIVE"}
                          />
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {plan.description}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {plan.code} - {formatCurrency(plan.price)} /{" "}
                          {formatStatus(plan.interval)} - Sort {plan.sortOrder}
                        </p>
                        {plan.stripePriceId && (
                          <p className="mt-1 text-xs text-gray-500">
                            Stripe: {plan.stripePriceId}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingPlan(plan)}
                          className="btn-secondary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlanToToggle(plan)}
                          disabled={planAction === `toggle:${plan.id}`}
                          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {plan.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </div>
                    {plan.benefits?.length > 0 && (
                      <ul className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                        {plan.benefits.map((benefit) => (
                          <li key={benefit} className="rounded bg-black/5 px-3 py-2">
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
            {planMeta && (
              <PaginationControls
                currentPage={planPage}
                pageSize={PLAN_PAGE_SIZE}
                totalItems={planTotal}
                totalPages={planMeta.totalPages}
                itemLabel="plans"
                onPageChange={setPlanPage}
              />
            )}
          </div>
        </div>
      </section>

      {campaignToSend && (
        <ConfirmDialog
          title="Send campaign?"
          description={`This will send "${campaignToSend.title}" to eligible ${formatStatus(campaignToSend.audience).toLowerCase()} users who allow marketing notifications.`}
          confirmLabel="Send Campaign"
          isLoading={campaignAction === `send:${campaignToSend.id}`}
          onCancel={() => setCampaignToSend(null)}
          onConfirm={() => void sendCampaign()}
        />
      )}

      {campaignToCreate && (
        <ConfirmDialog
          title="Send campaign now?"
          description={`This will immediately send "${campaignToCreate.title}" to eligible ${formatStatus(campaignToCreate.audience).toLowerCase()} users who allow marketing notifications.`}
          confirmLabel="Send Now"
          isLoading={campaignAction === "create"}
          onCancel={() => setCampaignToCreate(null)}
          onConfirm={() => void createCampaign(campaignToCreate)}
        />
      )}

      {planToToggle && (
        <ConfirmDialog
          title={planToToggle.isActive ? "Disable plan?" : "Enable plan?"}
          description={
            planToToggle.isActive
              ? `${planToToggle.name} will stop being available for new subscriptions. Existing records are not removed.`
              : `${planToToggle.name} will become available for subscription selection.`
          }
          confirmLabel={planToToggle.isActive ? "Disable Plan" : "Enable Plan"}
          isDestructive={planToToggle.isActive}
          isLoading={planAction === `toggle:${planToToggle.id}`}
          onCancel={() => setPlanToToggle(null)}
          onConfirm={() => void togglePlan()}
        />
      )}
    </div>
  );
}
