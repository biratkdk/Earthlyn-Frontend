import test from "node:test";
import assert from "node:assert/strict";
import { BuyerService } from "../src/buyer/buyer.service";
import { MessagingService } from "../src/messaging/messaging.service";
import { OrderService } from "../src/order/order.service";
import { SAFE_USER_SELECT } from "../src/common/prisma-selects";

function configService() {
  return {
    get(key: string, fallback?: string) {
      if (key === "MESSAGE_ENCRYPTION_KEY") {
        return "test_message_key_that_is_long_enough";
      }
      return fallback;
    },
  };
}

test("safe user select never exposes password hashes", () => {
  assert.equal("passwordHash" in SAFE_USER_SELECT, false);
  assert.equal("balance" in SAFE_USER_SELECT, false);
});

test("buyer list includes only safe user fields", async () => {
  let findManyArgs: any;
  const prisma = {
    buyer: {
      async findMany(args: any) {
        findManyArgs = args;
        return [];
      },
      async count() {
        return 0;
      },
    },
  };
  const service = new BuyerService(prisma as any);

  await service.findAll();

  assert.deepEqual(findManyArgs.include.user.select, SAFE_USER_SELECT);
});

test("order list includes only safe buyer fields", async () => {
  let findManyArgs: any;
  const prisma = {
    order: {
      async findMany(args: any) {
        findManyArgs = args;
        return [];
      },
      async count() {
        return 0;
      },
    },
  };
  const service = new OrderService(prisma as any, configService() as any);

  await service.findAll();

  assert.deepEqual(findManyArgs.include.buyer.select, SAFE_USER_SELECT);
});

test("message creation includes only safe sender and receiver fields", async () => {
  let createArgs: any;
  const prisma = {
    user: {
      async findUnique() {
        return { id: "receiver-1", isActive: true };
      },
    },
    message: {
      async create(args: any) {
        createArgs = args;
        return {
          id: "message-1",
          senderId: args.data.senderId,
          receiverId: args.data.receiverId,
          content: args.data.content,
          sender: { id: args.data.senderId },
          receiver: { id: args.data.receiverId },
        };
      },
    },
  };
  const service = new MessagingService(prisma as any, configService() as any);

  await service.sendMessage({
    senderId: "sender-1",
    receiverId: "receiver-1",
    content: "hello",
  });

  assert.deepEqual(createArgs.include.sender.select, SAFE_USER_SELECT);
  assert.deepEqual(createArgs.include.receiver.select, SAFE_USER_SELECT);
});
