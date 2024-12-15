import { BadRequestException, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { DeliveryManagementService } from "../delivery-management/delivery-management.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

const DEFAULT_BATCH_LIMIT = 50;
const FULFILLMENT_QUEUE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

export type FulfillmentQueueQuery = PaginationQuery & {
  status?: string;
};

@Injectable()
export class FulfillmentService {
  constructor(
    private prisma: PrismaService,
    private deliveryManagementService: DeliveryManagementService,
  ) {}

  @Cron("0 * * * *")
  async autoAdvance() {
    return this.advanceFulfillment({ source: "AUTO" });
  }

  async advanceFulfillment(
    options: {
      force?: boolean;
      actorId?: string;
      source?: "AUTO" | "ADMIN";
    } = {},
  ) {
    const automationEnabled = process.env.AUTO_FULFILL === "true";
    if (!automationEnabled && !options.force) {
      return {
        automationEnabled,
        processed: 0,
        productionStarted: 0,
        shipped: 0,
        delivered: 0,
      };
    }

    const stepHours = this.getStepHours();
    const cutoff = new Date(Date.now() - stepHours * 60 * 60 * 1000);
    const source = options.source || (options.force ? "ADMIN" : "AUTO");
    const productionStarted = await this.startDueProduction(
      cutoff,
      options.actorId,
      source,
    );
    const shipped = await this.shipDueOrders(cutoff, options.actorId, source);
    const delivered = await this.deliverDueOrders(
      cutoff,
      options.actorId,
      source,
    );

    return {
      automationEnabled,
      processed: productionStarted + shipped + delivered,
      productionStarted,
      shipped,
      delivered,
    };
  }

  async getOperationsSummary() {
    const whereSucceeded: Prisma.OrderWhereInput = {
      paymentStatus: PaymentStatus.SUCCEEDED,
    };
    const [confirmed, processing, shipped, delivered, failed, recentEvents] =
      await Promise.all([
        this.prisma.order.count({
          where: { ...whereSucceeded, status: OrderStatus.CONFIRMED },
        }),
        this.prisma.order.count({
          where: { ...whereSucceeded, status: OrderStatus.PROCESSING },
        }),
        this.prisma.order.count({
          where: { ...whereSucceeded, status: OrderStatus.SHIPPED },
        }),
        this.prisma.order.count({
          where: { ...whereSucceeded, status: OrderStatus.DELIVERED },
        }),
        this.prisma.order.count({
          where: { status: OrderStatus.CANCELLED },
        }),
        this.prisma.fulfillmentEvent.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            order: {
              select: {
                id: true,
                status: true,
                product: { select: { name: true } },
              },
            },
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        }),
      ]);

    return {
      automationEnabled: process.env.AUTO_FULFILL === "true",
      stepHours: this.getStepHours(),
      confirmed,
      processing,
      shipped,
      delivered,
      failed,
      active: confirmed + processing + shipped,
      recentEvents,
    };
  }

  async getFulfillmentQueue(query: FulfillmentQueueQuery = {}) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const status = this.getQueueStatus(query.status);
    const where: Prisma.OrderWhereInput = {
      paymentStatus: PaymentStatus.SUCCEEDED,
      status: status ? status : { in: FULFILLMENT_QUEUE_STATUSES },
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, email: true, name: true } },
          product: {
            include: {
              seller: {
                include: {
                  user: { select: { id: true, email: true, name: true } },
                },
              },
            },
          },
          fulfillmentEvents: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async getFulfillmentEvents(query: PaginationQuery = {}) {
    return this.deliveryManagementService.getFulfillmentEvents(query);
  }

  async updateFulfillmentStatus(
    orderId: string,
    status: string,
    actorId: string,
    trackingId?: string,
  ) {
    const normalizedStatus = status.trim().toUpperCase();
    if (normalizedStatus === OrderStatus.PROCESSING) {
      return this.startProcessingOrder(orderId, actorId, "ADMIN");
    }

    if (normalizedStatus === DeliveryStatus.IN_TRANSIT) {
      return this.deliveryManagementService.updateDeliveryStatus(
        orderId,
        DeliveryStatus.IN_TRANSIT,
        trackingId,
        {
          actorUserId: actorId,
          source: "ADMIN",
          note: "Admin operations marked shipment in transit",
        },
      );
    }

    if (normalizedStatus === DeliveryStatus.DELIVERED) {
      return this.deliveryManagementService.updateDeliveryStatus(
        orderId,
        DeliveryStatus.DELIVERED,
        trackingId,
        {
          actorUserId: actorId,
          source: "ADMIN",
          note: "Admin operations confirmed delivery",
        },
      );
    }

    if (normalizedStatus === DeliveryStatus.FAILED) {
      return this.deliveryManagementService.updateDeliveryStatus(
        orderId,
        DeliveryStatus.FAILED,
        trackingId,
        {
          actorUserId: actorId,
          source: "ADMIN",
          note: "Admin operations marked delivery failed",
        },
      );
    }

    throw new BadRequestException("Unsupported fulfillment status");
  }

  private async startDueProduction(
    cutoff: Date,
    actorId?: string,
    source: "AUTO" | "ADMIN" = "AUTO",
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.SUCCEEDED,
        updatedAt: { lte: cutoff },
      },
      orderBy: { updatedAt: "asc" },
      take: DEFAULT_BATCH_LIMIT,
    });

    for (const order of orders) {
      await this.startProcessingOrder(order.id, actorId, source);
    }

    return orders.length;
  }

  private async shipDueOrders(
    cutoff: Date,
    actorId?: string,
    source: "AUTO" | "ADMIN" = "AUTO",
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PROCESSING,
        paymentStatus: PaymentStatus.SUCCEEDED,
        updatedAt: { lte: cutoff },
      },
      orderBy: { updatedAt: "asc" },
      take: DEFAULT_BATCH_LIMIT,
    });

    for (const order of orders) {
      await this.deliveryManagementService.updateDeliveryStatus(
        order.id,
        DeliveryStatus.IN_TRANSIT,
        undefined,
        {
          actorUserId: actorId,
          source,
          note: "Automated fulfillment moved order to shipment",
        },
      );
    }

    return orders.length;
  }

  private async deliverDueOrders(
    cutoff: Date,
    actorId?: string,
    source: "AUTO" | "ADMIN" = "AUTO",
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.SHIPPED,
        paymentStatus: PaymentStatus.SUCCEEDED,
        updatedAt: { lte: cutoff },
      },
      orderBy: { updatedAt: "asc" },
      take: DEFAULT_BATCH_LIMIT,
    });

    for (const order of orders) {
      await this.deliveryManagementService.updateDeliveryStatus(
        order.id,
        DeliveryStatus.DELIVERED,
        undefined,
        {
          actorUserId: actorId,
          source,
          note: "Automated fulfillment confirmed delivery",
        },
      );
    }

    return orders.length;
  }

  private async startProcessingOrder(
    orderId: string,
    actorId?: string,
    source: "AUTO" | "ADMIN" = "AUTO",
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    if (order.paymentStatus !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException("Payment not completed");
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Cancelled orders cannot enter production");
    }

    if (order.status === OrderStatus.PROCESSING) {
      return order;
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot start production from ${order.status.toLowerCase()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PROCESSING },
      });

      await tx.product.update({
        where: { id: order.productId },
        data: { deliveryStatus: DeliveryStatus.PENDING },
      });

      await tx.fulfillmentEvent.create({
        data: {
          orderId: order.id,
          type: "PRODUCTION_STARTED",
          status: OrderStatus.PROCESSING,
          actorId,
          note:
            source === "ADMIN"
              ? "Admin operations started production"
              : "Automated fulfillment started production",
          metadata: {
            source,
            previousOrderStatus: order.status,
            nextOrderStatus: OrderStatus.PROCESSING,
            productId: order.productId,
          },
        },
      });

      return updatedOrder;
    });
  }

  private getQueueStatus(status?: string): OrderStatus | undefined {
    const normalizedStatus = status?.trim().toUpperCase();
    if (!normalizedStatus || normalizedStatus === "ALL") return undefined;

    if (
      Object.values(OrderStatus).includes(normalizedStatus as OrderStatus) &&
      FULFILLMENT_QUEUE_STATUSES.includes(normalizedStatus as OrderStatus)
    ) {
      return normalizedStatus as OrderStatus;
    }

    throw new BadRequestException("Invalid fulfillment queue status");
  }

  private getStepHours() {
    const parsed = Number(process.env.AUTO_FULFILL_STEP_HOURS || 24);
    if (!Number.isFinite(parsed) || parsed < 1) return 24;
    return Math.floor(parsed);
  }
}
