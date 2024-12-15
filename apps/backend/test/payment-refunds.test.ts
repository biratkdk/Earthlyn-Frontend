import test from "node:test";
import assert from "node:assert/strict";
import { PaymentService } from "../src/payment/payment.service";

test("manual refund uses idempotency key and writes admin audit metadata", async () => {
  const audits: any[] = [];
  const refundCalls: any[] = [];
  const service = Object.create(PaymentService.prototype) as PaymentService;

  (service as any).stripe = {
    refunds: {
      async create(params: unknown, options: unknown) {
        refundCalls.push({ params, options });
        return { id: "re_1", status: "succeeded", amount: 1250 };
      },
    },
    paymentIntents: {
      async retrieve() {
        return { id: "pi_1", status: "succeeded", amount: 1250 };
      },
    },
  };
  (service as any).prismaService = {
    adminAudit: {
      async create(payload: any) {
        audits.push(payload.data);
        return payload.data;
      },
    },
  };
  (service as any).syncOrderPayments = async () => 2;

  const result = await service.refundPayment("pi_1", 12.5, "refund-key", {
    adminId: "admin-1",
    reason: "Damaged shipment",
  });

  assert.equal(result.refundId, "re_1");
  assert.deepEqual(refundCalls[0], {
    params: { payment_intent: "pi_1", amount: 1250 },
    options: { idempotencyKey: "refund-key" },
  });
  assert.equal(audits[0].adminId, "admin-1");
  assert.equal(audits[0].action, "REFUND_PAYMENT");
  assert.equal(audits[0].entityId, "pi_1");
  assert.equal(audits[0].metadata.amount, 12.5);
  assert.equal(audits[0].metadata.reason, "Damaged shipment");
  assert.equal(audits[0].metadata.syncedOrders, 2);
});
