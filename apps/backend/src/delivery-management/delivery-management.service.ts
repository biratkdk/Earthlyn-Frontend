import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeliveryStatus, Prisma, TransactionType } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import { calculateSellerTier, getSellerTierRate } from "../common/seller-tiers";
import { WebSocketService } from "../websocket/websocket.service";
import { SAFE_USER_SELECT } from "../common/prisma-selects";

export interface DeliveryStatusUpdateOptions {
  sellerUserId?: string;
  actorUserId?: string;
  source?: "SELLER" | "ADMIN" | "AUTO";
  note?: string;
}

@Injectable()
export class DeliveryManagementService {
  private readonly logger = new Logger(DeliveryManagementService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Optional() private webSocketService?: WebSocketService,
  ) {}

  private calculateRewardPoints(totalAmount: number): number {
    return Math.floor(totalAmount * 0.05);
  }

  async getOrdersByStatus(
    userId: string,
    status?: DeliveryStatus,
    query?: PaginationQuery,
  ) {
    const pagination = getPaginationParams(query);
    const productWhere: Prisma.ProductWhereInput = {
      seller: { userId },
      ...(status ? { deliveryStatus: status } : {}),
    };
    const where: Prisma.OrderWhereInput = {
      product: productWhere,
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          product: true,
          buyer: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async updateDeliveryStatus(
    orderId: string,
    status: DeliveryStatus,
    trackingId?: string,
    options: DeliveryStatusUpdateOptions = {},
  ) {
    if (!status || !Object.values(DeliveryStatus).includes(status)) {
      throw new BadRequestException("Invalid delivery status");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: { include: { seller: true } },
        buyer: { select: SAFE_USER_SELECT },
      },
    });

    if (!order || !order.product)
      throw new NotFoundException("Order not found");
    if (
      options.sellerUserId &&
      order.product.seller?.userId !== options.sellerUserId
    ) {
      throw new BadRequestException("Not authorized for this order");
    }

    if (order.status === "CANCELLED") {
      throw new BadRequestException("Cancelled orders cannot be updated");
    }

    if (status === "DELIVERED" && order.status === "DELIVERED") {
      return order;
    }

    const updatedDeliveryOrder = await this.prisma.$transaction(async (tx) => {
      const orderStatus =
        status === "DELIVERED"
          ? "DELIVERED"
          : status === "IN_TRANSIT"
            ? "SHIPPED"
            : status === "FAILED"
              ? "CANCELLED"
              : "PROCESSING";
      const nextTrackingId =
        trackingId ||
        order.deliveryTrackingId ||
        (status === "IN_TRANSIT" || status === "DELIVERED"
          ? this.createTrackingId(order.id)
          : undefined);

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: orderStatus,
          deliveryTrackingId: nextTrackingId,
          deliveredAt: status === "DELIVERED" ? new Date() : null,
        },
      });

      await tx.product.update({
        where: { id: order.product.id },
        data: { deliveryStatus: status, updatedAt: new Date() },
      });

      await tx.fulfillmentEvent.create({
        data: {
          orderId: order.id,
          type: "DELIVERY_STATUS_UPDATED",
          status,
          actorId: options.actorUserId,
          note: options.note,
          metadata: {
            source: options.source || "SELLER",
            trackingId: nextTrackingId ?? null,
            previousOrderStatus: order.status,
            nextOrderStatus: orderStatus,
            previousDeliveryStatus: order.product.deliveryStatus,
            nextDeliveryStatus: status,
          },
        },
      });

      if (status !== "DELIVERED") {
        return updatedOrder;
      }
      if (order.paymentStatus !== "SUCCEEDED") {
        throw new BadRequestException("Payment not completed");
      }

      const seller = await tx.seller.findUnique({
        where: { id: order.product.sellerId },
      });
      if (!seller) throw new Error("Seller not found");

      const existingCredit = await tx.transaction.findFirst({
        where: {
          referenceType: "ORDER_DELIVERY",
          referenceId: order.id,
          userId: seller.userId,
        },
      });
      if (existingCredit) return updatedOrder;

      const tierRate = getSellerTierRate(seller.tier);
      const totalAmount = Number(order.totalAmount);
      const profitAmount = Number((totalAmount * tierRate).toFixed(2));

      await tx.transaction.create({
        data: {
          userId: seller.userId,
          amount: profitAmount,
          type: "CREDIT" as TransactionType,
          description: `Profit credit for order ${order.id}`,
          referenceType: "ORDER_DELIVERY",
          referenceId: order.id,
        },
      });

      const sellerUser = await tx.user.findUnique({
        where: { id: seller.userId },
        select: { balance: true },
      });
      if (!sellerUser) throw new Error("Seller user not found");

      await tx.user.update({
        where: { id: seller.userId },
        data: { balance: Number(sellerUser.balance) + profitAmount },
      });

      const newTotalSales = Number(seller.totalSales) + totalAmount;
      const newTier = calculateSellerTier(newTotalSales);
      await tx.seller.update({
        where: { id: seller.id },
        data: { totalSales: newTotalSales, tier: newTier },
      });

      const ecoPointsPerDollar =
        this.configService.get<number>("commerce.ecoPointsPerDollar") ?? 1;
      const ecoPoints = Math.floor(
        totalAmount *
          ecoPointsPerDollar *
          (1 + (order.product.ecoScore || 0) / 100),
      );

      const existingEco = await tx.ecoImpact.findFirst({
        where: { orderId: order.id },
      });
      if (!existingEco) {
        await tx.ecoImpact.create({
          data: {
            userId: order.buyerId,
            productId: order.productId,
            orderId: order.id,
            pointsEarned: ecoPoints,
            impact: `Earned ${ecoPoints} eco points for order ${order.id}`,
          },
        });

        const buyerUser = await tx.user.findUnique({
          where: { id: order.buyerId },
          select: { ecoPoints: true },
        });
        if (!buyerUser) throw new BadRequestException("Buyer not found");

        await tx.user.update({
          where: { id: order.buyerId },
          data: { ecoPoints: buyerUser.ecoPoints + ecoPoints },
        });
      }

      const rewardPoints = this.calculateRewardPoints(totalAmount);
      const existingReward = await tx.transaction.findFirst({
        where: {
          referenceType: "ORDER_REWARD_POINTS",
          referenceId: order.id,
          userId: order.buyerId,
        },
      });
      if (!existingReward) {
        await tx.transaction.create({
          data: {
            userId: order.buyerId,
            amount: rewardPoints,
            type: "CREDIT" as TransactionType,
            description: `Reward points (5% of order value) for order ${order.id}`,
            referenceType: "ORDER_REWARD_POINTS",
            referenceId: order.id,
          },
        });

        const buyer = await tx.buyer.findUnique({
          where: { userId: order.buyerId },
        });
        if (buyer) {
          await tx.buyer.update({
            where: { id: buyer.id },
            data: { rewardPoints: buyer.rewardPoints + rewardPoints },
          });
        }
      }

      return updatedOrder;
    });

    await this.notifyBuyerDeliveryUpdate(
      order.buyerId,
      updatedDeliveryOrder.id,
      status,
      updatedDeliveryOrder.deliveryTrackingId ?? undefined,
    );

    return updatedDeliveryOrder;
  }

  async getFulfillmentEvents(query: PaginationQuery = {}) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const [items, totalItems] = await Promise.all([
      this.prisma.fulfillmentEvent.findMany({
        include: {
          order: {
            select: {
              id: true,
              status: true,
              deliveryTrackingId: true,
              totalAmount: true,
              createdAt: true,
              product: { select: { id: true, name: true } },
              buyer: { select: { id: true, email: true } },
            },
          },
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.fulfillmentEvent.count(),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async getDeliveryStats(userId: string) {
    const where = { seller: { userId } };
    const [total, pending, inTransit, delivered, failed] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.count({
        where: { ...where, deliveryStatus: "PENDING" },
      }),
      this.prisma.product.count({
        where: { ...where, deliveryStatus: "IN_TRANSIT" },
      }),
      this.prisma.product.count({
        where: { ...where, deliveryStatus: "DELIVERED" },
      }),
      this.prisma.product.count({
        where: { ...where, deliveryStatus: "FAILED" },
      }),
    ]);

    return { total, pending, inTransit, delivered, failed };
  }

  async trackOrder(orderId: string) {
    return await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        deliveryTrackingId: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { deliveryStatus: true } },
      },
    });
  }

  private createTrackingId(orderId: string) {
    return `ETH-${orderId
      .replace(/[^a-z0-9]/gi, "")
      .slice(-10)
      .toUpperCase()}`;
  }

  private async notifyBuyerDeliveryUpdate(
    buyerId: string,
    orderId: string,
    status: DeliveryStatus,
    trackingId?: string,
  ) {
    try {
      await this.webSocketService?.notifyDeliveryUpdate(
        buyerId,
        orderId,
        status,
        trackingId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit delivery update for order ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
