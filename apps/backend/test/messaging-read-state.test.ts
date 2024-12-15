import test from "node:test";
import assert from "node:assert/strict";
import { MessagingService } from "../src/messaging/messaging.service";

function createMessagingService() {
  const state = {
    updateManyCalls: [] as any[],
    updatePayload: null as any,
    message: { id: "message-1", receiverId: "buyer-1" },
  };

  const prisma = {
    state,
    message: {
      async findUnique() {
        return state.message;
      },
      async update(payload: any) {
        state.updatePayload = payload;
        return { ...state.message, ...payload.data };
      },
      async updateMany(payload: any) {
        state.updateManyCalls.push(payload);
        return { count: 2 };
      },
    },
  };

  const service = new MessagingService(
    prisma as any,
    {
      get(key: string) {
        if (key === "MESSAGE_ENCRYPTION_KEY") {
          return "test_message_key_that_is_long_enough";
        }
        return undefined;
      },
    } as any,
  );

  return { service, prisma };
}

test("markAsRead records read state and timestamp for the receiver", async () => {
  const { service, prisma } = createMessagingService();

  const message = await service.markAsRead("message-1", "buyer-1");

  assert.equal(message.isRead, true);
  assert.ok(message.readAt instanceof Date);
  assert.equal(prisma.state.updatePayload.where.id, "message-1");
});

test("markConversationAsRead marks only inbound unread messages from the other user", async () => {
  const { service, prisma } = createMessagingService();

  const result = await service.markConversationAsRead("buyer-1", "seller-1");

  assert.equal(result.count, 2);
  assert.deepEqual(prisma.state.updateManyCalls[0].where, {
    senderId: "seller-1",
    receiverId: "buyer-1",
    isRead: false,
  });
  assert.equal(prisma.state.updateManyCalls[0].data.isRead, true);
  assert.ok(prisma.state.updateManyCalls[0].data.readAt instanceof Date);
});

test("markConversationAsUnread clears read timestamp on inbound messages", async () => {
  const { service, prisma } = createMessagingService();

  await service.markConversationAsUnread("buyer-1", "seller-1");

  assert.deepEqual(prisma.state.updateManyCalls[0], {
    where: {
      senderId: "seller-1",
      receiverId: "buyer-1",
      isRead: true,
    },
    data: {
      isRead: false,
      readAt: null,
    },
  });
});
