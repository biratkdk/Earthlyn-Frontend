import { expect, test } from "@playwright/test";
import { buyerUser, mockBackend, paginated, seedCookieConsent } from "./helpers";

test("auth login sends credentials and lands on the buyer dashboard", async ({
  page,
}) => {
  let loginPayload: unknown = null;
  let loggedIn = false;

  await seedCookieConsent(page);

  await mockBackend(page, {
    "GET /auth/validate": (route) =>
      route.fulfill({
        status: loggedIn ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(loggedIn ? buyerUser : { message: "Unauthorized" }),
      }),
    "POST /auth/login": async (route) => {
      loginPayload = await route.request().postDataJSON();
      loggedIn = true;
      await route.fulfill({
        contentType: "application/json",
        headers: {
          "set-cookie":
            "earthlyn-session=e2e-session; Path=/; SameSite=Lax, earthlyn-session-role=BUYER; Path=/; SameSite=Lax, XSRF-TOKEN=e2e-xsrf; Path=/; SameSite=Lax",
        },
        body: JSON.stringify({
          user: buyerUser,
        }),
      });
    },
    "GET /orders/buyer/buyer-1": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(paginated([])),
      }),
  });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("you@example.com").fill("buyer@example.com");
  await page.getByPlaceholder("~~~~~~~~").fill("Password1");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.getByRole("button", { name: "Login" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: "Buyer Dashboard" })).toBeVisible();
  expect(loginPayload).toEqual({
    email: "buyer@example.com",
    password: "Password1",
  });
});
