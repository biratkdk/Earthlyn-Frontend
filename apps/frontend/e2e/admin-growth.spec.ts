import { expect, test } from "@playwright/test";
import { authenticateAs, mockBackend, paginated } from "./helpers";

const adminUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN",
};

test("admin growth page renders live controls from mocked growth APIs", async ({
  page,
}) => {
  await authenticateAs(page, adminUser);
  await mockBackend(page, {
    "GET /auth/validate": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ user: adminUser }),
      }),
    "GET /admin/growth/summary": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          referrals: {
            total: 4,
            pending: 2,
            completed: 2,
            conversionRate: 50,
          },
          subscriptions: {
            total: 3,
            active: 2,
            cancelled: 1,
            expired: 0,
            monthlyRecurringRevenue: 58,
            planBreakdown: [],
          },
          campaigns: { total: 1, sent: 0, draft: 1, recent: [] },
          audience: { buyers: 12, sellers: 4, marketingReach: 14 },
          recommendations: {
            approvedProducts: 8,
            inStockProducts: 7,
            topCategories: [{ category: "Home", count: 4 }],
          },
        }),
      }),
    "GET /admin/analytics/dashboard": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ totalRevenue: 120, totalOrders: 6 }),
      }),
    "GET /admin/analytics/eco-impact": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ecoFriendlyProducts: 8 }),
      }),
    "GET /admin/analytics/referrals": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ total: 4, pending: 2, completed: 2 }),
      }),
    "GET /admin/analytics/subscriptions": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ active: 2, cancelled: 1, expired: 0 }),
      }),
    "GET /admin/analytics/retention": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ totalBuyers: 10, repeatBuyers: 3 }),
      }),
    "GET /admin/analytics/products": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ approved: 8, pending: 1, rejected: 0 }),
      }),
    "GET /admin/analytics/user-growth": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ newUsers: 3, newSellers: 1 }),
      }),
    "GET /admin/analytics/revenue-trends": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ totalRevenue: 120, ordersCount: 6 }),
      }),
    "GET /admin/analytics/categories": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ category: "Home", count: 4 }]),
      }),
    "GET /admin/analytics/top-sellers": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "seller-1",
            tier: "BLOOM",
            user: { name: "Eco Seller" },
            products: [{ id: "product-1" }],
          },
        ]),
      }),
    "GET /admin/growth/campaigns": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          paginated([
            {
              id: "campaign-1",
              createdById: "admin-1",
              title: "Reusable week",
              message: "New biodegradable essentials are available this week.",
              audience: "BUYERS",
              status: "DRAFT",
              recipientCount: 0,
              sentAt: null,
              createdAt: new Date().toISOString(),
            },
          ]),
        ),
      }),
    "GET /admin/growth/referrals": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          paginated([
            {
              id: "referral-1",
              referrerId: "buyer-1",
              refereeId: "buyer-2",
              status: "PENDING",
              createdAt: new Date().toISOString(),
              referrer: { name: "Buyer One", email: "one@example.com" },
              referee: { name: "Buyer Two", email: "two@example.com" },
            },
          ]),
        ),
      }),
    "GET /admin/growth/subscription-plans": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          paginated([
            {
              id: "plan-1",
              code: "SEED_BOX",
              name: "Seed Box",
              description: "Starter monthly bundle for low-waste essentials.",
              price: 19,
              interval: "MONTHLY",
              benefits: ["3 biodegradable staples"],
              stripePriceId: "price_seed",
              isActive: true,
              sortOrder: 10,
            },
          ]),
        ),
      }),
  });

  await page.goto("/dashboard/admin/growth", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Growth Controls" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Marketing Campaigns" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Referral Rewards" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Subscription Plans" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Campaign" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Plan" })).toBeVisible();
});
