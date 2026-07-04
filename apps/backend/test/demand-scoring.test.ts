import test from "node:test";
import assert from "node:assert/strict";
import { ProductService } from "../src/product/product.service";

function makePrisma(product: any) {
  return {
    product: {
      async findFirst() { return product; },
      async findMany() { return []; },
      async update() { return {}; },
      async count() { return 0; },
    },
    order: {
      async count() { return product?._recentOrders ?? 0; },
    },
    productReview: {
      async findMany() { return []; },
      async aggregate() { return { _avg: { rating: null }, _count: { _all: 0 } }; },
    },
  };
}

test("demandTier is NONE when viewCount and orders are both zero", async () => {
  const svc = new ProductService(makePrisma({ id: "p1", viewCount: 0, _recentOrders: 0 }) as any, { get: () => 0.05 } as any);
  const result = await svc.getDemandInfo("p1");
  assert.equal(result.demandTier, "NONE");
  assert.equal(result.surgeMultiplier, 1);
});

test("demandTier is HIGH when demand score >= 70", async () => {
  // demandScore = min(100, round(viewCount*0.3 + recentOrders*15))
  // 5 orders = 75 → HIGH
  const prisma = makePrisma({ id: "p1", viewCount: 0, price: 10, _recentOrders: 5 });
  prisma.order.count = async () => 5;
  const svc = new ProductService(prisma as any, { get: () => 0.05 } as any);
  const result = await svc.getDemandInfo("p1");
  assert.equal(result.demandTier, "HIGH");
  assert.ok(result.surgeMultiplier > 1);
});

test("surgeMultiplier does not exceed 1.25", async () => {
  const prisma = makePrisma({ id: "p1", viewCount: 1000, price: 20, _recentOrders: 0 });
  prisma.order.count = async () => 20;
  const svc = new ProductService(prisma as any, { get: () => 0.05 } as any);
  const result = await svc.getDemandInfo("p1");
  assert.ok(result.surgeMultiplier <= 1.25);
});
