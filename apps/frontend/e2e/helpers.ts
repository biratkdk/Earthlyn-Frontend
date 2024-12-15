import type { Page, Route } from "@playwright/test";

type Handler = (route: Route) => Promise<void> | void;
const e2eBaseUrl = `http://127.0.0.1:${Number(process.env.PORT || 3000)}`;

export const buyerUser = {
  id: "buyer-1",
  email: "buyer@example.com",
  name: "Buyer User",
  role: "BUYER",
};

export const sellerUser = {
  id: "seller-user-1",
  email: "seller@example.com",
  name: "Seller User",
  role: "SELLER",
};

export function paginated<T>(items: T[]) {
  return {
    items,
    meta: {
      page: 1,
      pageSize: Math.max(items.length, 1),
      totalItems: items.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

export async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "earthlyn-cookie-consent-v1",
      JSON.stringify({
        analytics: false,
        marketing: false,
        savedAt: new Date().toISOString(),
      }),
    );
  });
}

export async function authenticateAs(page: Page, user: typeof buyerUser) {
  await seedCookieConsent(page);

  await page.context().addCookies([
    {
      name: "earthlyn-session",
      value: "e2e-session",
      url: e2eBaseUrl,
      sameSite: "Lax",
    },
    {
      name: "earthlyn-session-role",
      value: user.role,
      url: e2eBaseUrl,
      sameSite: "Lax",
    },
    {
      name: "XSRF-TOKEN",
      value: "e2e-xsrf",
      url: e2eBaseUrl,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript((authUser) => {
    window.localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
          user: authUser,
          isHydrated: true,
        },
        version: 0,
      }),
    );
  }, user);
}

export async function seedCart(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cart-store",
      JSON.stringify({
        state: {
          items: [
            {
              id: "product-1",
              name: "Compostable Bottle",
              price: 12,
              quantity: 2,
              sellerId: "seller-1",
            },
          ],
        },
        version: 0,
      }),
    );
  });
}

export async function mockBackend(
  page: Page,
  handlers: Record<string, Handler>,
) {
  await page.route(/http:\/\/(127\.0\.0\.1|localhost):3001\/.*/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    const handler = handlers[key];

    if (handler) {
      await handler(route);
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: `No mock for ${key}` }),
    });
  });
}
