import test from "node:test";
import assert from "node:assert/strict";
import { DisputeStatus } from "@prisma/client";
import { DisputesService } from "../src/disputes/disputes.service";
import { UserRole } from "../src/common/decorators/roles.decorator";

function createDisputesHarness() {
  const notifications: any[] = [];
  const audits: any[] = [];
  const messages: any[] = [];
  const dispute = {
    id: "dispute-1",
    orderId: "order-1",
    openedById: "buyer-1",
    assignedToId: null,
    status: DisputeStatus.OPEN,
    resolution: null,
    resolvedAt: null,
    resolvedById: null,
    order: {
      product: {
        seller: {
          userId: "seller-1",
        },
      },
    },
    openedBy: { id: "buyer-1", name: "Buyer", role: UserRole.BUYER },
    assignedTo: null,
    resolvedBy: null,
  };
  const getDispute = () => ({ ...dispute, messages: [...messages] });
  const prisma = {
    state: { dispute, notifications, audits, messages },
    dispute: {
      async findUnique(payload: any) {
        return payload.where.id === dispute.id ? getDispute() : null;
      },
      async update(payload: any) {
        Object.assign(dispute, payload.data);
        return getDispute();
      },
    },
    disputeMessage: {
      async create(payload: any) {
        const message = {
          id: `message-${messages.length + 1}`,
          ...payload.data,
          createdAt: new Date(),
          user: {
            id: payload.data.userId,
            name: "Seller",
            role: UserRole.SELLER,
          },
        };
        messages.push(message);
        return message;
      },
    },
    notification: {
      async create(payload: any) {
        notifications.push(payload.data);
        return payload.data;
      },
      async findFirst() {
        return null;
      },
    },
    adminAudit: {
      async create(payload: any) {
        audits.push(payload.data);
        return payload.data;
      },
    },
  };

  return {
    prisma,
    service: new DisputesService(prisma as any, { get: () => 72 } as any),
  };
}

test("update requires a resolution before resolving a dispute", async () => {
  const { service } = createDisputesHarness();

  await assert.rejects(
    () => service.update("dispute-1", "admin-1", { status: "RESOLVED" as any }),
    /Resolution is required/,
  );
});

test("update resolves dispute, writes audit, and notifies opener", async () => {
  const { prisma, service } = createDisputesHarness();

  const updated = await service.update("dispute-1", "admin-1", {
    status: "RESOLVED" as any,
    resolution: "Replacement shipment approved.",
  });

  assert.equal(updated.status, DisputeStatus.RESOLVED);
  assert.equal(updated.resolvedById, "admin-1");
  assert.equal(prisma.state.audits[0].action, "UPDATE_DISPUTE");
  assert.equal(prisma.state.audits[0].metadata.previousStatus, "OPEN");
  assert.equal(prisma.state.audits[0].metadata.nextStatus, "RESOLVED");
  assert.equal(prisma.state.notifications[0].type, "DISPUTE_RESOLVED");
});

test("getForUser allows order seller and rejects unrelated users", async () => {
  const { service } = createDisputesHarness();

  const detail = await service.getForUser(
    "dispute-1",
    "seller-1",
    UserRole.SELLER,
  );

  assert.equal(detail.id, "dispute-1");
  await assert.rejects(
    () => service.getForUser("dispute-1", "buyer-2", UserRole.BUYER),
    /Not authorized/,
  );
});

test("respond records a dispute message and moves open dispute into review", async () => {
  const { prisma, service } = createDisputesHarness();

  const updated = await service.respond(
    "dispute-1",
    "seller-1",
    UserRole.SELLER,
    { message: "Replacement shipment has been prepared." },
  );

  assert.equal(updated.status, DisputeStatus.IN_REVIEW);
  assert.equal(
    prisma.state.messages[0].message,
    "Replacement shipment has been prepared.",
  );
  assert.equal(prisma.state.notifications[0].type, "DISPUTE_RESPONSE");
  assert.equal(prisma.state.notifications[0].userId, "buyer-1");
});
