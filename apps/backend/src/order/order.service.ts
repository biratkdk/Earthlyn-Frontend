import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { QueueService } from "../common/services/queue.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderStatus, Prisma, TransactionType } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PaymentService } from "../payment/payment.service";
import { WebSocketService } from "../websocket/websocket.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import { SAFE_USER_SELECT } from "../common/prisma-selects";

type OrderWithProductAndBuyer = Prisma.OrderGetPayload<{
  include: { product: true; buyer: { select: typeof SAFE_USER_SELECT } };
}>;

export type OrderListQuery = PaginationQuery & {
  sortBy?: string;
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
    private queueService?: QueueService,
    @Optional() private paymentService?: PaymentService,
    @Optional() private webSocketService?: WebSocketService,
  ) {}

  async create(buyerId: string, createOrderDto: CreateOrderDto) {
    const autoFulfill =
      this.configService.get<string>("AUTO_FULFILL", "false") === "true";

    const order = await this.prismaService.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: createOrderDto.productId },
        include: { seller: true },
      });

      if (!product) {
        throw new NotFoundException("Product not found");
      }
      if (product.approvalStatus !== "APPROVED") {
        throw new BadRequestException("Product is not approved");
      }

      const stockUpdate = await tx.product.updateMany({
        where: {
          id: product.id,
          approvalStatus: "APPROVED",
          stock: { gte: createOrderDto.quantity },
        },
        data: {
          stock: { decrement: createOrderDto.quantity },
          deliveryStatus: autoFulfill ? "IN_TRANSIT" : product.deliveryStatus,
        },
      });

      if (stockUpdate.count !== 1) {
        throw new BadRequestException("Insufficient stock");
      }

      const totalAmount = Number(product.price) * createOrderDto.quantity;
      const newOrder = await tx.order.create({
        data: {
          buyerId,
          productId: createOrderDto.productId,
          quantity: createOrderDto.quantity,
          totalAmount: totalAmount.toString(),
          paymentIntentId: createOrderDto.paymentIntentId,
          paymentStatus: "PENDING",
          status: autoFulfill ? "PROCESSING" : "PENDING",
        },
        include: {
          product: true,
          buyer: { select: SAFE_USER_SELECT },
        },
      });

      await tx.fulfillmentEvent.create({
        data: {
          orderId: newOrder.id,
          type: "ORDER_CREATED",
          status: newOrder.status,
          metadata: {
            source: "ORDER_SERVICE",
            paymentStatus: newOrder.paymentStatus,
            productId: newOrder.productId,
            quantity: newOrder.quantity,
          },
        },
      });

      return newOrder;
    });

    if (this.queueService) {
      try {
        await this.queueService.addOrderConfirmationEmail(
          order.buyer.email,
          order.id,
          order.product.name,
          order.quantity,
          Number(order.totalAmount),
        );
        this.logger.log(
          `Order confirmation email queued for order ${order.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue order confirmation email: ${error.message}`,
        );
      }
    }

    if (this.queueService) {
      try {
        const status = autoFulfill ? "PROCESSING" : "PENDING";
        await this.queueService.addOrderStatusNotification(
          buyerId,
          order.id,
          status,
        );
        this.logger.log(
          `Order status notification queued for order ${order.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue order notification: ${error.message}`,
        );
      }
    }

    return order;
  }

  async findAll(
    filters?: { buyerId?: string; status?: OrderStatus },
    paginationQuery?: OrderListQuery,
  ) {
    const pagination = getPaginationParams(paginationQuery);
    const where = filters || {};
    const orderBy = this.getOrderBy(paginationQuery?.sortBy);
    const [items, totalItems] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        include: {
          product: true,
          buyer: { select: SAFE_USER_SELECT },
        },
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prismaService.order.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async findOne(id: string) {
    return this.prismaService.order.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            seller: true,
          },
        },
        buyer: { select: SAFE_USER_SELECT },
        ecoImpacts: true,
      },
    });
  }

  async update(id: string, data: Prisma.OrderUpdateInput) {
    const updatedOrder = await this.prismaService.order.update({
      where: { id },
      data,
      include: {
        product: true,
        buyer: { select: SAFE_USER_SELECT },
      },
    });
    await this.notifyBuyerOrderUpdate(updatedOrder);
    return updatedOrder;
  }

  async remove(id: string) {
    return this.prismaService.order.delete({
      where: { id },
    });
  }

  async findByBuyer(buyerId: string, paginationQuery?: OrderListQuery) {
    const pagination = getPaginationParams(paginationQuery);
    const where: Prisma.OrderWhereInput = { buyerId };
    const orderBy = this.getOrderBy(paginationQuery?.sortBy);
    const [items, totalItems] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        include: {
          product: {
            include: {
              seller: true,
            },
          },
        },
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prismaService.order.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async findByStatus(status: OrderStatus, paginationQuery?: OrderListQuery) {
    return this.findAll({ status }, paginationQuery);
  }

  private getOrderBy(sortBy?: string): Prisma.OrderOrderByWithRelationInput {
    switch (sortBy) {
      case "created-asc":
        return { createdAt: "asc" };
      case "total-desc":
        return { totalAmount: "desc" };
      case "total-asc":
        return { totalAmount: "asc" };
      case "status-asc":
        return { status: "asc" };
      case "created-desc":
      default:
        return { createdAt: "desc" };
    }
  }

  // Cancel an order - refund payment, restore inventory, create refund transaction
  async cancelOrder(
    orderId: string,
    userId: string,
    isAdmin = false,
  ): Promise<OrderWithProductAndBuyer> {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        buyer: { select: SAFE_USER_SELECT },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Verify authorization
    if (!isAdmin && order.buyerId !== userId) {
      throw new BadRequestException("Not authorized to cancel this order");
    }

    // Check if order can be cancelled
    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}.`,
      );
    }

    if (order.paymentStatus === "SUCCEEDED" && order.paymentIntentId) {
      if (!this.paymentService) {
        throw new BadRequestException("Payment refund service is unavailable");
      }

      await this.paymentService.refundOrderPayment(
        order.paymentIntentId,
        Number(order.totalAmount),
        order.id,
      );
    }

    const updatedOrder = await this.prismaService.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED" as OrderStatus,
          paymentStatus:
            order.paymentStatus === "SUCCEEDED"
              ? "REFUNDED"
              : order.paymentStatus,
          updatedAt: new Date(),
        },
        include: {
          product: true,
          buyer: { select: SAFE_USER_SELECT },
        },
      });

      await tx.fulfillmentEvent.create({
        data: {
          orderId,
          type: "ORDER_CANCELLED",
          status: "CANCELLED",
          actorId: userId,
          metadata: {
            source: isAdmin ? "ADMIN" : "BUYER",
            previousOrderStatus: order.status,
            paymentStatus: order.paymentStatus,
          },
        },
      });

      // Restore inventory
      await tx.product.update({
        where: { id: order.productId },
        data: {
          stock: order.product.stock + order.quantity,
        },
      });

      // Create refund transaction
      const refundAmount = Number(order.totalAmount);
      await tx.transaction.create({
        data: {
          userId: order.buyerId,
          type: "CREDIT" as TransactionType,
          amount: refundAmount,
          description: `Refund for cancelled order ${orderId}`,
          referenceType: "ORDER_CANCELLATION",
          referenceId: orderId,
        },
      });

      // Update user balance
      const buyerUser = await tx.user.findUnique({
        where: { id: order.buyerId },
        select: { balance: true },
      });

      if (buyerUser) {
        await tx.user.update({
          where: { id: order.buyerId },
          data: {
            balance: Number(buyerUser.balance) + refundAmount,
          },
        });
      }

      return cancelled;
    });

    if (this.queueService) {
      try {
        await this.queueService.addRefundEmail(
          order.buyer.email,
          orderId,
          Number(order.totalAmount),
        );
        this.logger.log(`Refund email queued for cancelled order ${orderId}`);
      } catch (error) {
        this.logger.error(`Failed to queue refund email: ${error.message}`);
      }
    }

    await this.notifyBuyerOrderUpdate(updatedOrder);

    return updatedOrder;
  }

  private async notifyBuyerOrderUpdate(order: {
    buyerId: string;
    id: string;
    status: string;
  }) {
    try {
      await this.webSocketService?.notifyOrderUpdate(
        order.buyerId,
        order.id,
        order.status,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit order update for order ${order.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

