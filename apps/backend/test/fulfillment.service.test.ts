import test from "node:test";
import assert from "node:assert/strict";
import { DeliveryStatus, OrderStatus, PaymentStatus } from "@prisma/client";
import { FulfillmentService } from "../src/fulfillment/fulfillment.service";

function createFulfillmentHarness() {
  const orders: Record<string, any> = {
    confirmed: {
      id: "confirmed",
      productId: "product-1",
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.SUCCEEDED,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      product: { id: "product-1" },
    },
    processing: {
      id: "processing",
      productId: "product-2",
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.SUCCEEDED,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    shipped: {
      id: "shipped",
      productId: "product-3",
      status: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.SUCCEEDED,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  };
  const events: any[] = [];
  const deliveryCalls: any[] = [];

  const prisma = {
    state: { orders, events },
    order: {
      async findMany(payload: any) {
        return Object.values(orders).filter(
          (order) =>
            order.status === payload.where.status &&
            (!payload.where.updatedAt?.lte ||
              order.updatedAt.getTime() <=
                payload.where.updatedAt.lte.getTime()),
        );
      },
      async findUnique(payload: any) {
        return orders[payload.where.id] || null;
      },
      async update(payload: any) {
        const order = orders[payload.where.id];
        orders[payload.where.id] = {
          ...order,
          ...payload.data,
          updatedAt: new Date(),
        };
        return orders[payload.where.id];
      },
      async count() {
        return 0;
      },
    },
    product: {
      async update() {
        return {};
      },
    },
    fulfillmentEvent: {
      async create(payload: any) {
        events.push(payload.data);
        return payload.data;
      },
      async findMany() {
        return events;
      },
      async count() {
        return events.length;
      },
    },
    async $transaction(callback: (transaction: any) => unknown) {
      return callback(prisma);
    },
  };

  const deliveryManagementService = {
    calls: deliveryCalls,
    async updateDeliveryStatus(
      orderId: string,
      status: DeliveryStatus,
      trackingId?: string,
      options?: unknown,
    ) {
      deliveryCalls.push({ orderId, status, trackingId, options });
      orders[orderId].status =
        status === DeliveryStatus.DELIVERED
          ? OrderStatus.DELIVERED
          : status === DeliveryStatus.IN_TRANSIT
            ? OrderStatus.SHIPPED
            : orders[orderId].status;
      orders[orderId].updatedAt = new Date();
      return orders[orderId];
    },
    async getFulfillmentEvents() {
      return { items: events, meta: { totalItems: events.length } };
    },
  };

  return {
    prisma,
    deliveryManagementService,
    service: new FulfillmentService(
      prisma as any,
      deliveryManagementService as any,
    ),
  };
}

test("advanceFulfillment does nothing when automation is disabled and not forced", async () => {
  const previousValue = process.env.AUTO_FULFILL;
  process.env.AUTO_FULFILL = "false";
  const { service, deliveryManagementService } = createFulfillmentHarness();

  const result = await service.advanceFulfillment();

  assert.equal(result.processed, 0);
  assert.equal(deliveryManagementService.calls.length, 0);
  if (previousValue === undefined) {
    delete process.env.AUTO_FULFILL;
  } else {
    process.env.AUTO_FULFILL = previousValue;
  }
});

test("advanceFulfillment starts production, ships, and delivers through shared delivery service", async () => {
  const { service, prisma, deliveryManagementService } =
    createFulfillmentHarness();

  const result = await service.advanceFulfillment({
    force: true,
    actorId: "admin-1",
    source: "ADMIN",
  });

  assert.equal(result.productionStarted, 1);
  assert.equal(result.shipped, 1);
  assert.equal(result.delivered, 1);
  assert.equal(prisma.state.orders.confirmed.status, OrderStatus.PROCESSING);
  assert.deepEqual(
    deliveryManagementService.calls.map((call) => call.status),
    [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED],
  );
  assert.equal(prisma.state.events[0].type, "PRODUCTION_STARTED");
  assert.equal(prisma.state.events[0].actorId, "admin-1");
});

test("updateFulfillmentStatus delegates delivery statuses to delivery management", async () => {
  const { service, deliveryManagementService } = createFulfillmentHarness();

  await service.updateFulfillmentStatus(
    "processing",
    "IN_TRANSIT",
    "admin-1",
    "TRACK-1",
  );

  assert.deepEqual(deliveryManagementService.calls[0], {
    orderId: "processing",
    status: DeliveryStatus.IN_TRANSIT,
    trackingId: "TRACK-1",
    options: {
      actorUserId: "admin-1",
      source: "ADMIN",
      note: "Admin operations marked shipment in transit",
    },
  });
});
