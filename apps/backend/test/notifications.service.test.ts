import test from "node:test";
import assert from "node:assert/strict";
import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "../src/notifications/notifications.service";

function createNotificationsHarness() {
  const notifications = [
    {
      id: "notification-1",
      userId: "user-1",
      type: "PROMOTION",
      message: "Campaign",
      readAt: null,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    {
      id: "notification-2",
      userId: "user-1",
      type: "REFERRAL_REWARD",
      message: "Reward",
      readAt: new Date("2026-01-03T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "notification-3",
      userId: "user-2",
      type: "PROMOTION",
      message: "Other user",
      readAt: null,
      createdAt: new Date("2026-01-04T00:00:00.000Z"),
    },
  ];

  function matchesWhere(notification: any, where: any) {
    if (where.id && notification.id !== where.id) return false;
    if (where.userId && notification.userId !== where.userId) return false;
    if (where.type && notification.type !== where.type) return false;
    if (Object.prototype.hasOwnProperty.call(where, "readAt")) {
      return notification.readAt === where.readAt;
    }

    return true;
  }

  const prisma = {
    state: { notifications },
    notification: {
      async findMany(payload: any) {
        return notifications
          .filter((notification) => matchesWhere(notification, payload.where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(payload.skip, payload.skip + payload.take);
      },
      async count(payload: any) {
        return notifications.filter((notification) =>
          matchesWhere(notification, payload.where),
        ).length;
      },
      async findFirst(payload: any) {
        return (
          notifications.find((notification) =>
            matchesWhere(notification, payload.where),
          ) || null
        );
      },
      async update(payload: any) {
        const notification = notifications.find(
          (item) => item.id === payload.where.id,
        );
        Object.assign(notification, payload.data);
        return notification;
      },
      async updateMany(payload: any) {
        const targets = notifications.filter((notification) =>
          matchesWhere(notification, payload.where),
        );
        targets.forEach((notification) =>
          Object.assign(notification, payload.data),
        );
        return { count: targets.length };
      },
    },
  };

  return {
    prisma,
    service: new NotificationsService(prisma as any),
  };
}

test("list returns only the user's unread notifications with pagination", async () => {
  const { service } = createNotificationsHarness();

  const result = await service.list("user-1", {
    unreadOnly: "true",
    page: 1,
    pageSize: 10,
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "notification-1");
  assert.equal(result.meta.totalItems, 1);
});

test("markAsRead refuses notifications owned by another user", async () => {
  const { service } = createNotificationsHarness();

  await assert.rejects(
    () => service.markAsRead("user-1", "notification-3"),
    NotFoundException,
  );
});

test("markAllAsRead marks only unread notifications for the current user", async () => {
  const { service, prisma } = createNotificationsHarness();

  const result = await service.markAllAsRead("user-1");

  assert.equal(result.count, 1);
  assert.ok(prisma.state.notifications[0].readAt instanceof Date);
  assert.equal(prisma.state.notifications[2].readAt, null);
});
