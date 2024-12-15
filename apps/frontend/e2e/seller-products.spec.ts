import { expect, test } from "@playwright/test";
import { authenticateAs, mockBackend, paginated, sellerUser } from "./helpers";

test("seller can create and then edit a product from the seller dashboard", async ({
  page,
}) => {
  const products: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    approvalStatus: string;
    ecoScore: number;
    category: string;
    sellerId: string;
  }> = [];

  await authenticateAs(page, sellerUser);
  await mockBackend(page, {
    "GET /auth/validate": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(sellerUser),
      }),
    "GET /products/mine": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(paginated(products)),
      }),
    "GET /sellers/by-user/seller-user-1": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "seller-1",
          userId: sellerUser.id,
          totalSales: 0,
        }),
      }),
    "GET /sellers/seller-1/earnings": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          totalEarnings: 0,
          totalOrders: 0,
          averageOrderValue: 0,
        }),
      }),
    "GET /sellers/seller-1/profit-summary": (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          totalSales: 0,
          totalEarnings: 0,
          orderCount: 0,
        }),
      }),
    "POST /products": async (route) => {
      const payload = await route.request().postDataJSON();
      const product = {
        id: "product-1",
        approvalStatus: "PENDING",
        sellerId: "seller-1",
        ...payload,
      };
      products.push(product);
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(product),
      });
    },
    "PATCH /products/product-1": async (route) => {
      const payload = await route.request().postDataJSON();
      Object.assign(products[0], payload);
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(products[0]),
      });
    },
  });

  await page.goto("/dashboard/seller", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add Product" }).click();
  await page.getByPlaceholder("Product name").fill("Bamboo Soap Dish");
  await page.getByPlaceholder("Price").fill("18");
  await page.getByPlaceholder("Stock").fill("12");
  await page.getByPlaceholder("Eco score").fill("88");
  await page.getByPlaceholder("Category").fill("Home");
  await page.getByPlaceholder("Description").fill("Biodegradable bathroom accessory.");
  await page.getByRole("button", { name: "Create Product" }).click();

  await expect(page.getByText("Bamboo Soap Dish")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.locator('input[value="18"]').fill("20");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("$20.00")).toBeVisible();
});
