import { expect, test } from "@playwright/test";
import {
  authenticateAs,
  buyerUser,
  mockBackend,
  paginated,
  seedCart,
} from "./helpers";

test("checkout creates a payment intent from cart and completes the paid handoff", async ({
  page,
}) => {
  let paymentIntentPayload: unknown = null;

  await authenticateAs(page, buyerUser);
  await seedCart(page);
  await mockBackend(page, {
    "GET /auth/validate": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(buyerUser),
      }),
    "GET /products/product-1": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "product-1",
          name: "Compostable Bottle",
          price: 12,
          stock: 10,
          category: "Kitchen",
          ecoScore: 90,
        }),
      }),
    "POST /payments/create-intent": async (route) => {
      paymentIntentPayload = await route.request().postDataJSON();
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          clientSecret: "pi_e2e_secret_test",
          paymentIntentId: "pi_e2e",
          amount: 24,
        }),
      });
    },
    "GET /orders/buyer/buyer-1": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(paginated([])),
      }),
  });

  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Full Name").fill("Buyer User");
  await page.getByPlaceholder("Email").fill("buyer@example.com");
  await page.getByPlaceholder("Street Address").fill("123 Soil Street");
  await page.getByPlaceholder("City").fill("Portland");
  await page.getByPlaceholder("State / Province").fill("OR");
  await page.getByPlaceholder("ZIP Code").fill("97201");
  await page.getByRole("button", { name: "Continue to payment" }).click();

  await expect(page.getByText("E2E payment session ready for pi_e2e.")).toBeVisible();
  expect(paymentIntentPayload).toMatchObject({
    items: [{ productId: "product-1", quantity: 2 }],
    shippingAddress: {
      email: "buyer@example.com",
      fullName: "Buyer User",
      address: "123 Soil Street",
    },
  });

  await page.getByRole("button", { name: "Simulate paid order" }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
});
