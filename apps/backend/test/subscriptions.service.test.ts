import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { SubscriptionsService } from "../src/subscriptions/subscriptions.service";

function createSubscriptionsHarness(options?: {
  plan?: any;
  activeSubscription?: any;
  subscription?: any;
}) {
  const prisma = {
    subscriptionPlan: {
      async findMany() {
        return options?.plan ? [options.plan] : [];
      },
      async findUnique() {
        return options?.plan || null;
      },
    },
    subscription: {
      async findFirst() {
        return options?.activeSubscription || null;
      },
      async create(payload: any) {
        return { id: "sub-1", ...payload.data };
      },
      async findUnique() {
        return options?.subscription || null;
      },
      async update(payload: any) {
        return { ...options?.subscription, ...payload.data };
      },
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
    },
    async $transaction(payload: unknown) {
      return Array.isArray(payload) ? Promise.all(payload) : payload;
    },
  };

  return { service: new SubscriptionsService(prisma as any) };
}

test("create rejects unknown subscription plans", async () => {
  const { service } = createSubscriptionsHarness();

  await assert.rejects(
    () => service.create("user-1", { plan: "UNKNOWN" }),
    BadRequestException,
  );
});

test("create rejects duplicate active subscriptions", async () => {
  const { service } = createSubscriptionsHarness({
    plan: { code: "SEED_BOX", isActive: true },
    activeSubscription: { id: "sub-active", status: "ACTIVE" },
  });

  await assert.rejects(
    () => service.create("user-1", { plan: "SEED_BOX" }),
    ConflictException,
  );
});

test("cancel blocks subscriptions owned by another user", async () => {
  const { service } = createSubscriptionsHarness({
    subscription: { id: "sub-1", userId: "owner-1", status: "ACTIVE" },
  });

  await assert.rejects(
    () => service.cancel("user-1", "sub-1"),
    ForbiddenException,
  );
});
