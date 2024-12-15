import test from "node:test";
import assert from "node:assert/strict";
import { OrderService } from "../src/order/order.service";

function createPrisma() {
  const state = {
    order: {
      id: "order-1",
      buyerId: "buyer-1",
      productId: "product-1",
      quantity: 2,
      totalAmount: 30,
      paymentIntentId: "pi_paid",
      paymentStatus: "SUCCEEDED",
      status: "CONFIRMED",
      product: {
        id: "product-1",
        stock: 3,
      },
      buyer: {
        id: "buyer-1",
        email: "buyer@example.com",
      },
    },
    user: {
      id: "buyer-1",
      balance: 5,
    },
    transactions: [] as any[],
    payments: [] as any[],
    fulfillmentEvents: [] as any[],
  };

  const prisma = {
    state,
    order: {
      async findUnique() {
        return state.order;
      },
      async update({ data }: any) {
        state.order = { ...state.order, ...data };
        return state.order;
      },
    },
    product: {
      async update({ data }: any) {
        state.order.product.stock = data.stock;
        return state.order.product;
      },
    },
    transaction: {
      async findFirst({ where }: any) {
        return (
          state.transactions.find(
            (transaction) =>
              transaction.referenceType === where.referenceType &&
              transaction.referenceId === where.referenceId &&
              transaction.userId === where.userId,
          ) ?? null
        );
      },
      async create({ data }: any) {
        state.transactions.push(data);
        return data;
      },
    },
    user: {
      async findUnique() {
        return state.user;
      },
      async update({ data }: any) {
        state.user.balance = data.balance;
        return state.user;
      },
    },
    payment: {
      async findFirst({ where }: any) {
        return (
          state.payments.find((payment) => payment.orderId === where.orderId) ??
          null
        );
      },
      async create({ data }: any) {
        state.payments.push(data);
        return data;
      },
      async update({ where, data }: any) {
        const payment = state.payments.find(
          (candidate) => candidate.id === where.id,
        );
        Object.assign(payment, data);
        return payment;
      },
    },
    fulfillmentEvent: {
      async create({ data }: any) {
        state.fulfillmentEvents.push(data);
        return data;
      },
    },
    async $transaction(fn: any) {
      return fn(this);
    },
  };

  return prisma;
}

test("cancelOrder refunds the Stripe PaymentIntent before crediting internal refund records", async () => {
  const prisma = createPrisma();
  const refunded: Array<{
    paymentIntentId: string;
    amount: number;
    orderId: string;
  }> = [];
  const paymentService = {
    async refundOrderPayment(
      paymentIntentId: string,
      amount: number,
      orderId: string,
    ) {
      refunded.push({ paymentIntentId, amount, orderId });
      return { refundId: "re_1", status: "succeeded", amount, syncedOrders: 1 };
    },
  };
  const service = new OrderService(
    prisma as any,
    { get: () => "false" } as any,
    undefined,
    paymentService as any,
  );

  const cancelled = await service.cancelOrder("order-1", "buyer-1");

  assert.equal(cancelled.status, "CANCELLED");
  assert.deepEqual(refunded, [
    { paymentIntentId: "pi_paid", amount: 30, orderId: "order-1" },
  ]);
  assert.equal(prisma.state.transactions.length, 1);
  assert.equal(prisma.state.user.balance, 35);
  assert.equal(prisma.state.fulfillmentEvents[0].type, "ORDER_CANCELLED");
});

test("cancelOrder queues a refund confirmation email after cancellation", async () => {
  const prisma = createPrisma();
  const queuedRefunds: Array<{ to: string; orderId: string; amount: number }> =
    [];
  const queueService = {
    async addRefundEmail(to: string, orderId: string, refundAmount: number) {
      queuedRefunds.push({ to, orderId, amount: refundAmount });
      return { id: "email-1" };
    },
  };
  const paymentService = {
    async refundOrderPayment() {
      return {
        refundId: "re_1",
        status: "succeeded",
        amount: 30,
        syncedOrders: 1,
      };
    },
  };
  const service = new OrderService(
    prisma as any,
    { get: () => "false" } as any,
    queueService as any,
    paymentService as any,
  );

  await service.cancelOrder("order-1", "buyer-1");

  assert.deepEqual(queuedRefunds, [
    { to: "buyer@example.com", orderId: "order-1", amount: 30 },
  ]);
});

test("cancelOrder emits a buyer order update after cancellation", async () => {
  const prisma = createPrisma();
  const emitted: Array<{ userId: string; orderId: string; status: string }> =
    [];
  const paymentService = {
    async refundOrderPayment() {
      return {
        refundId: "re_1",
        status: "succeeded",
        amount: 30,
        syncedOrders: 1,
      };
    },
  };
  const webSocketService = {
    async notifyOrderUpdate(userId: string, orderId: string, status: string) {
      emitted.push({ userId, orderId, status });
    },
  };
  const service = new OrderService(
    prisma as any,
    { get: () => "false" } as any,
    undefined,
    paymentService as any,
    webSocketService as any,
  );

  await service.cancelOrder("order-1", "buyer-1");

  assert.deepEqual(emitted, [
    { userId: "buyer-1", orderId: "order-1", status: "CANCELLED" },
  ]);
});
