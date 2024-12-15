import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

export type NotificationQuery = PaginationQuery & {
  type?: string;
  unreadOnly?: string | boolean;
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, query: NotificationQuery = {}) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const where = this.getUserNotificationWhere(userId, query);
    const [items, totalItems] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private getUserNotificationWhere(
    userId: string,
    query: NotificationQuery,
  ): Prisma.NotificationWhereInput {
    const type = query.type?.trim().toUpperCase();
    const unreadOnly =
      query.unreadOnly === true || String(query.unreadOnly) === "true";

    return {
      userId,
      ...(type && type !== "ALL" ? { type } : {}),
      ...(unreadOnly ? { readAt: null } : {}),
    };
  }
}
