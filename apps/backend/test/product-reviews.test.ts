import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { ProductService } from "../src/product/product.service";

function createProductReviewPrisma(hasDeliveredOrder = true) {
  const state = {
    reviews: [] as any[],
    upsertPayload: null as any,
  };

  const prisma = {
    state,
    product: {
      async findFirst() {
        return {
          id: "product-1",
          approvalStatus: "APPROVED",
        };
      },
    },
    order: {
      async findFirst() {
        return hasDeliveredOrder ? { id: "order-1" } : null;
      },
    },
    productReview: {
      async upsert(payload: any) {
        state.upsertPayload = payload;
        const review = {
          id: "review-1",
          ...payload.create,
          user: { id: payload.create.userId, name: "Buyer" },
        };
        state.reviews.push(review);
        return review;
      },
      async findMany() {
        return state.reviews;
      },
      async aggregate() {
        return {
          _avg: { rating: 5 },
          _count: { _all: state.reviews.length },
        };
      },
    },
  };

  return prisma;
}

test("createReview requires a delivered order for the buyer and product", async () => {
  const prisma = createProductReviewPrisma(false);
  const service = new ProductService(prisma as any, { get: () => 0.05 } as any);

  await assert.rejects(
    () =>
      service.createReview("product-1", "buyer-1", {
        rating: 5,
        comment: "Great quality",
      }),
    BadRequestException,
  );
});

test("createReview upserts one review per buyer and product", async () => {
  const prisma = createProductReviewPrisma(true);
  const service = new ProductService(prisma as any, { get: () => 0.05 } as any);

  const review = await service.createReview("product-1", "buyer-1", {
    rating: 5,
    comment: " Great quality ",
  });

  assert.equal(review.rating, 5);
  assert.equal(review.comment, "Great quality");
  assert.deepEqual(prisma.state.upsertPayload.where, {
    userId_productId: { userId: "buyer-1", productId: "product-1" },
  });
});

test("getReviews returns review items with aggregate summary", async () => {
  const prisma = createProductReviewPrisma(true);
  prisma.state.reviews.push({
    id: "review-1",
    productId: "product-1",
    userId: "buyer-1",
    rating: 5,
    comment: "Great quality",
  });
  const service = new ProductService(prisma as any, { get: () => 0.05 } as any);

  const result = await service.getReviews("product-1");

  assert.equal(result.items.length, 1);
  assert.deepEqual(result.summary, {
    averageRating: 5,
    totalReviews: 1,
  });
});
