import test from "node:test";
import assert from "node:assert/strict";
import { DeliveryStatus, OrderStatus, PaymentStatus } from "@prisma/client";
import { DeliveryManagementService } from "../src/delivery-management/delivery-management.service";

function createDeliveryHarness() {
  const state = {
    order: {
      id: "order-1",
      buyerId: "buyer-1",
      productId: "product-1",
      quantity: 1,
      totalAmount: 100,
      paymentStatus: PaymentStatus.SUCCEEDED,
      status: OrderStatus.PROCESSING,
      deliveryTrackingId: null as string | null,
      product: {
        id: "product-1",
        sellerId: "seller-1",
        deliveryStatus: DeliveryStatus.PENDING,
        ecoScore: 20,
        seller: { id: "seller-1", userId: "seller-user-1" },
      },
      buyer: { id: "buyer-1", email: "buyer@example.com" },
    },
    fulfillmentEvents: [] as any[],
  };

  const prisma = {
    state,
    order: {
      async findUnique({ where }: any) {
        return where.id === state.order.id ? state.order : null;
      },
      async update({ data }: any) {
        state.order = { ...state.order, ...data };
        return state.order;
      },
    },
    product: {
      async update({ data }: any) {
        state.order.product = { ...state.order.product, ...data };
        return state.order.product;
      },
    },
    fulfillmentEvent: {
      async create({ data }: any) {
        state.fulfillmentEvents.push(data);
        return data;
      },
    },
    async $transaction(callback: (transaction: any) => unknown) {
      return callback(this);
    },
  };

  const emitted: Array<{
    userId: string;
    orderId: string;
    status: string;
    trackingId?: string;
  }> = [];
  const webSocketService = {
    async notifyDeliveryUpdate(
      userId: string,
      orderId: string,
      status: string,
      trackingId?: string,
    ) {
      emitted.push({ userId, orderId, status, trackingId });
    },
  };

  return {
    state,
    emitted,
    service: new DeliveryManagementService(
      prisma as any,
      { get: () => 1 } as any,
      webSocketService as any,
    ),
  };
}

test("updateDeliveryStatus emits a buyer delivery update after status change", async () => {
  const { service, state, emitted } = createDeliveryHarness();

  const updated = await service.updateDeliveryStatus(
    "order-1",
    DeliveryStatus.IN_TRANSIT,
    "TRACK-1",
    {
      actorUserId: "seller-user-1",
      source: "SELLER",
      note: "Seller marked shipped",
    },
  );

  assert.equal(updated.status, OrderStatus.SHIPPED);
  assert.equal(state.fulfillmentEvents[0].type, "DELIVERY_STATUS_UPDATED");
  assert.deepEqual(emitted, [
    {
      userId: "buyer-1",
      orderId: "order-1",
      status: DeliveryStatus.IN_TRANSIT,
      trackingId: "TRACK-1",
    },
  ]);
});
