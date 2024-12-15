import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { validate } from "class-validator";
import { GrowthService } from "../src/growth/growth.service";
import { UpdateSubscriptionPlanDto } from "../src/growth/dto/update-subscription-plan.dto";

function createGrowthHarness() {
  const notifications: any[] = [];
  const audits: any[] = [];
  const campaigns: any[] = [];
  const subscriptionPlans: any[] = [
    {
      id: "plan-1",
      code: "SEED_BOX",
      name: "Seed Box",
      description: "Starter monthly bundle",
      price: 19,
      interval: "MONTHLY",
      benefits: ["Starter products"],
      stripePriceId: null,
      isActive: true,
      sortOrder: 10,
    },
  ];
  const referral = {
    id: "referral-1",
    referrerId: "referrer-1",
    refereeId: "referee-1",
    status: "PENDING",
    referrer: { id: "referrer-1", email: "referrer@example.com" },
    referee: { id: "referee-1", email: "referee@example.com" },
  };

  const prisma = {
    state: { notifications, audits, campaigns, referral, subscriptionPlans },
    user: {
      async findMany() {
        return [{ id: "buyer-1" }];
      },
      async update(payload: any) {
        return payload;
      },
    },
    marketingCampaign: {
      async create(payload: any) {
        const campaign = {
          id: `campaign-${campaigns.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...payload.data,
        };
        campaigns.push(campaign);
        return campaign;
      },
      async findUnique(payload: any) {
        return campaigns.find((item) => item.id === payload.where.id) || null;
      },
      async update(payload: any) {
        const index = campaigns.findIndex((item) => item.id === payload.where.id);
        campaigns[index] = { ...campaigns[index], ...payload.data };
        return campaigns[index];
      },
    },
    subscriptionPlan: {
      async create(payload: any) {
        const plan = {
          id: `plan-${subscriptionPlans.length + 1}`,
          ...payload.data,
        };
        subscriptionPlans.push(plan);
        return plan;
      },
      async findUnique(payload: any) {
        return (
          subscriptionPlans.find((plan) => plan.id === payload.where.id) || null
        );
      },
      async update(payload: any) {
        const index = subscriptionPlans.findIndex(
          (plan) => plan.id === payload.where.id,
        );
        subscriptionPlans[index] = {
          ...subscriptionPlans[index],
          ...payload.data,
        };
        return subscriptionPlans[index];
      },
    },
    notification: {
      async createMany(payload: any) {
        notifications.push(...payload.data);
        return { count: payload.data.length };
      },
      async create(payload: any) {
        notifications.push(payload.data);
        return payload.data;
      },
    },
    referral: {
      async findUnique() {
        return referral;
      },
      async update(payload: any) {
        referral.status = payload.data.status;
        return referral;
      },
    },
    adminAudit: {
      async create(payload: any) {
        audits.push(payload.data);
        return payload.data;
      },
    },
    async $transaction(callback: (transaction: any) => unknown) {
      return callback(prisma);
    },
  };

  return { prisma, service: new GrowthService(prisma as any) };
}

test("createCampaign stores campaign history and sends notifications", async () => {
  const { prisma, service } = createGrowthHarness();

  const campaign = await service.createCampaign("admin-1", {
    title: "Reusable week",
    message: "New biodegradable essentials are available this week.",
    audience: "BUYERS",
    sendNow: true,
  });

  assert.equal(campaign.status, "SENT");
  assert.equal(campaign.recipientCount, 1);
  assert.equal(prisma.state.notifications.length, 1);
  assert.equal(prisma.state.notifications[0].type, "PROMOTION");
  assert.equal(prisma.state.audits[0].action, "SEND_MARKETING_CAMPAIGN");
});

test("sendCampaign sends an existing draft and audits the send", async () => {
  const { prisma, service } = createGrowthHarness();

  await service.createCampaign("admin-1", {
    title: "Reusable week",
    message: "New biodegradable essentials are available this week.",
    audience: "BUYERS",
    sendNow: false,
  });

  const campaign = await service.sendCampaign("admin-1", "campaign-1");

  assert.equal(campaign.status, "SENT");
  assert.equal(campaign.recipientCount, 1);
  assert.equal(prisma.state.notifications.length, 1);
  assert.equal(prisma.state.notifications[0].metadata.campaignId, "campaign-1");
  assert.equal(
    prisma.state.audits.at(-1).action,
    "SEND_MARKETING_CAMPAIGN",
  );
});

test("sendCampaign rejects campaigns that have already been sent", async () => {
  const { service } = createGrowthHarness();

  await service.createCampaign("admin-1", {
    title: "Reusable week",
    message: "New biodegradable essentials are available this week.",
    audience: "BUYERS",
    sendNow: true,
  });

  await assert.rejects(
    () => service.sendCampaign("admin-1", "campaign-1"),
    /Campaign has already been sent/,
  );
});

test("updateReferralStatus rewards the referrer when completing once", async () => {
  const { prisma, service } = createGrowthHarness();

  const updated = await service.updateReferralStatus("admin-1", "referral-1", {
    status: "COMPLETED",
    rewardPoints: 300,
  });

  assert.equal(updated.status, "COMPLETED");
  assert.equal(prisma.state.notifications[0].type, "REFERRAL_REWARD");
  assert.equal(prisma.state.notifications[0].metadata.rewardPoints, 300);
  assert.equal(prisma.state.audits[0].action, "UPDATE_REFERRAL_STATUS");
});

test("createSubscriptionPlan normalizes plan code and audits creation", async () => {
  const { prisma, service } = createGrowthHarness();

  const plan = await service.createSubscriptionPlan("admin-1", {
    code: "bloom box",
    name: "Bloom Box",
    description: "Balanced bundle for recurring eco upgrades.",
    price: 39,
    interval: "MONTHLY",
    benefits: ["Curated sustainable products"],
    isActive: true,
    sortOrder: 20,
  });

  assert.equal(plan.code, "BLOOM_BOX");
  assert.equal(plan.price, 39);
  assert.equal(prisma.state.subscriptionPlans.length, 2);
  assert.equal(prisma.state.audits.at(-1).action, "CREATE_SUBSCRIPTION_PLAN");
});

test("createSubscriptionPlan rejects invalid plan codes", async () => {
  const { service } = createGrowthHarness();

  await assert.rejects(
    () =>
      service.createSubscriptionPlan("admin-1", {
        code: "bad-code!",
        name: "Broken Box",
        description: "Invalid code should not be accepted.",
        price: 39,
        interval: "MONTHLY",
        benefits: ["Curated sustainable products"],
        isActive: true,
        sortOrder: 20,
      }),
    /Plan code may only contain letters, numbers, and underscores/,
  );
});

test("updateSubscriptionPlan changes active state and records previous price", async () => {
  const { prisma, service } = createGrowthHarness();

  const plan = await service.updateSubscriptionPlan("admin-1", "plan-1", {
    price: 21,
    isActive: false,
  });

  assert.equal(plan.price, 21);
  assert.equal(plan.isActive, false);
  assert.equal(prisma.state.subscriptionPlans[0].price, 21);
  assert.equal(prisma.state.audits.at(-1).action, "UPDATE_SUBSCRIPTION_PLAN");
  assert.equal(prisma.state.audits.at(-1).metadata.previousPrice, 19);
  assert.equal(prisma.state.audits.at(-1).metadata.nextPrice, 21);
});

test("UpdateSubscriptionPlanDto rejects invalid update values", async () => {
  const dto = Object.assign(new UpdateSubscriptionPlanDto(), {
    price: -1,
    interval: "WEEKLY",
    sortOrder: 10001,
  });

  const errors = await validate(dto);
  const properties = errors.map((error) => error.property);

  assert(properties.includes("price"));
  assert(properties.includes("interval"));
  assert(properties.includes("sortOrder"));
});
