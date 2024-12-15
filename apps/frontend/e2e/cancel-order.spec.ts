import { expect, test } from "@playwright/test";
import { authenticateAs, buyerUser, mockBackend } from "./helpers";

test("buyer can cancel a cancellable order from the order detail page", async ({
  page,
}) => {
  let cancelled = false;
  const getOrder = () => ({
    id: "order-1",
    buyerId: buyerUser.id,
    status: cancelled ? "CANCELLED" : "CONFIRMED",
    totalAmount: "24.00",
    createdAt: "2026-06-01T00:00:00.000Z",
    buyer: buyerUser,
    product: {
      id: "product-1",
      name: "Compostable Bottle",
      deliveryStatus: cancelled ? "FAILED" : "PENDING",
    },
    ecoImpacts: [],
  });

  await authenticateAs(page, buyerUser);
  await mockBackend(page, {
    "GET /auth/validate": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(buyerUser),
      }),
    "GET /orders/order-1": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(getOrder()),
      }),
    "POST /orders/order-1/cancel": (route) => {
      cancelled = true;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(getOrder()),
      });
    },
  });

  await page.goto("/orders/order-1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Cancel Order" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel Order" }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Cancel order?" });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Cancel order" }).click();

  await expect(page.getByText("This order was cancelled.")).toBeVisible();
  await expect(page.getByText("CANCELLED").first()).toBeVisible();
});
