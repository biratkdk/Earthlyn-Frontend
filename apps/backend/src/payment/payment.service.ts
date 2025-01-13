import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "../database/prisma.service";
import {
  CheckoutItemDto,
  CreatePaymentIntentDto,
} from "./dto/create-payment-intent.dto";

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    const apiKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    this.stripe = new Stripe(apiKey, { timeout: 90000 });
  }

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: string,
  ) {
    const { items, orderId, shippingAddress } = createPaymentIntentDto;
    const amount = await this.calculateServerAmount(items);
    const cartItems = JSON.stringify(
      items.map(({ productId, quantity }) => ({ productId, quantity })),
    );

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId,
          email: shippingAddress.email,
          itemCount: String(items.length),
          productIds: items.map((item) => item.productId).join(","),
          cartItems,
          orderId: orderId || "",
        },
        receipt_email: shippingAddress.email,
        shipping: {
          name: shippingAddress.fullName,
          address: {
            line1: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.state,
            country: shippingAddress.country,
            postal_code: shippingAddress.zipCode,
          },
        },
        description: `EARTHLYN checkout ${new Date().toISOString()}`,
      });

      if (orderId) {
        await this.upsertPaymentRecord(
          orderId,
          paymentIntent.id,
          amount,
          PaymentStatus.PENDING,
        );
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to create payment intent");
    }
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    userId: string,
    isAdmin = false,
  ) {
    const paymentIntent = await this.retrievePaymentIntent(paymentIntentId);
    this.assertPaymentAccess(paymentIntent, userId, isAdmin);

    const paymentStatus = this.mapStripePaymentStatus(paymentIntent.status);
    if (paymentStatus !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        `Payment is not complete. Stripe status: ${paymentIntent.status}`,
      );
    }

    const syncedOrders = await this.syncOrderPayments(
      paymentIntent,
      PaymentStatus.SUCCEEDED,
    );

    return {
      status: PaymentStatus.SUCCEEDED,
      stripeStatus: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      paymentIntentId: paymentIntent.id,
      syncedOrders,
    };
  }

  async refundOrderPayment(
    paymentIntentId: string,
    amount: number,
    orderId: string,
  ) {
    return this.refundPayment(
      paymentIntentId,
      amount,
      `order-cancellation:${orderId}:${paymentIntentId}`,
    );
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    idempotencyKey?: string,
    audit?: { adminId: string; reason?: string },
  ) {
    try {
      const refundParams = {
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      };
      const refund = idempotencyKey
        ? await this.stripe.refunds.create(refundParams, { idempotencyKey })
        : await this.stripe.refunds.create(refundParams);
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
      const syncedOrders = await this.syncOrderPayments(
        paymentIntent,
        PaymentStatus.REFUNDED,
      );
      const refundAmount = refund.amount / 100;

      if (audit?.adminId) {
        await this.prismaService.adminAudit.create({
          data: {
            adminId: audit.adminId,
            action: "REFUND_PAYMENT",
            entityType: "PAYMENT_INTENT",
            entityId: paymentIntentId,
            metadata: {
              refundId: refund.id,
              status: refund.status,
              amount: refundAmount,
              reason: audit.reason || null,
              syncedOrders,
            },
          },
        });
      }

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refundAmount,
        syncedOrders,
      };
    } catch {
      throw new InternalServerErrorException("Refund failed");
    }
  }

  async getPaymentIntentStatus(
    paymentIntentId: string,
    userId: string,
    isAdmin = false,
  ) {
    const paymentIntent = await this.retrievePaymentIntent(paymentIntentId);
    this.assertPaymentAccess(paymentIntent, userId, isAdmin);

    return {
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
    };
  }

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | string[] | undefined,
  ) {
    if (!rawBody) {
      throw new BadRequestException("Missing Stripe raw body");
    }

    const secret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;
    if (!sig) {
      throw new BadRequestException("Missing Stripe signature");
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, sig, secret);

    switch (event.type) {
      case "payment_intent.succeeded":
        await this.syncOrderPayments(
          event.data.object as Stripe.PaymentIntent,
          PaymentStatus.SUCCEEDED,
        );
        break;
      case "payment_intent.payment_failed":
        await this.syncOrderPayments(
          event.data.object as Stripe.PaymentIntent,
          PaymentStatus.FAILED,
        );
        break;
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const intentId = charge.payment_intent?.toString();
        if (intentId) {
          const paymentIntent =
            await this.stripe.paymentIntents.retrieve(intentId);
          await this.syncOrderPayments(paymentIntent, PaymentStatus.REFUNDED);
        }
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async calculateServerAmount(items: CheckoutItemDto[]) {
    const quantities = new Map<string, number>();
    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) || 0) + item.quantity,
      );
    }

    const products = await this.prismaService.product.findMany({
      where: {
        id: { in: Array.from(quantities.keys()) },
        approvalStatus: "APPROVED",
      },
      select: { id: true, price: true, stock: true },
    });

    if (products.length !== quantities.size) {
      throw new BadRequestException("One or more products are unavailable");
    }

    const amount = products.reduce((sum, product) => {
      const quantity = quantities.get(product.id) || 0;
      if (product.stock < quantity) {
        throw new BadRequestException("Insufficient stock");
      }

      return sum + Number(product.price) * quantity;
    }, 0);

    return Number(amount.toFixed(2));
  }

  private async syncOrderPayments(
    paymentIntent: Stripe.PaymentIntent,
    status: PaymentStatus,
  ) {
    const metadataOrderId = paymentIntent.metadata?.orderId;
    const orders = metadataOrderId
      ? await this.prismaService.order.findMany({
          where: { id: metadataOrderId },
        })
      : await this.prismaService.order.findMany({
          where: { paymentIntentId: paymentIntent.id },
        });

    if (!orders.length) {
      if (status === PaymentStatus.SUCCEEDED) {
        return this.createPaidOrdersFromPaymentIntent(paymentIntent);
      }

      return 0;
    }

    return this.prismaService.$transaction(async (tx) => {
      for (const order of orders) {
        const data: Prisma.OrderUpdateInput = {
          paymentStatus: status,
          paymentIntentId: paymentIntent.id,
        };

        if (status === PaymentStatus.SUCCEEDED && order.status === "PENDING") {
          data.status = OrderStatus.CONFIRMED;
        }

        if (status === PaymentStatus.FAILED && order.status !== "CANCELLED") {
          data.status = "CANCELLED";
          await tx.product.update({
            where: { id: order.productId },
            data: { stock: { increment: order.quantity } },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data,
        });

        if (data.status === OrderStatus.CONFIRMED) {
          await tx.fulfillmentEvent.create({
            data: {
              orderId: order.id,
              type: "PAYMENT_CONFIRMED",
              status: updatedOrder.status,
              metadata: {
                source: "PAYMENT_SYNC",
                paymentIntentId: paymentIntent.id,
                previousOrderStatus: order.status,
                nextOrderStatus: updatedOrder.status,
              },
            },
          });
        }

        await this.upsertPaymentRecord(
          order.id,
          paymentIntent.id,
          Number(order.totalAmount),
          status,
          tx,
        );
      }

      return orders.length;
    });
  }

  private async createPaidOrdersFromPaymentIntent(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const userId = paymentIntent.metadata?.userId;
    const items = this.parseCheckoutItems(paymentIntent.metadata?.cartItems);

    if (!userId || !items.length) {
      throw new BadRequestException("Payment is missing checkout metadata");
    }

    const expectedAmount = await this.calculateServerAmount(items);
    if (Math.round(expectedAmount * 100) !== paymentIntent.amount) {
      throw new BadRequestException("Payment amount no longer matches cart");
    }

    return this.prismaService.$transaction(async (tx) => {
      let created = 0;

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, price: true, approvalStatus: true },
        });

        if (!product || product.approvalStatus !== "APPROVED") {
          throw new BadRequestException("One or more products are unavailable");
        }

        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            approvalStatus: "APPROVED",
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new BadRequestException("Insufficient stock");
        }

        const order = await tx.order.create({
          data: {
            buyerId: userId,
            productId: item.productId,
            quantity: item.quantity,
            totalAmount: (Number(product.price) * item.quantity).toFixed(2),
            paymentIntentId: paymentIntent.id,
            paymentStatus: PaymentStatus.SUCCEEDED,
            status: OrderStatus.CONFIRMED,
          },
        });

        await tx.fulfillmentEvent.create({
          data: {
            orderId: order.id,
            type: "PAYMENT_CONFIRMED",
            status: order.status,
            metadata: {
              source: "PAYMENT_CHECKOUT",
              paymentIntentId: paymentIntent.id,
              productId: order.productId,
              quantity: order.quantity,
            },
          },
        });

        await this.upsertPaymentRecord(
          order.id,
          paymentIntent.id,
          Number(order.totalAmount),
          PaymentStatus.SUCCEEDED,
          tx,
        );

        created += 1;
      }

      return created;
    });
  }

  private parseCheckoutItems(rawItems?: string): CheckoutItemDto[] {
    if (!rawItems) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(rawItems);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => {
          if (typeof item !== "object" || item === null) {
            return null;
          }

          const candidate = item as Partial<CheckoutItemDto>;
          if (
            typeof candidate.productId !== "string" ||
            typeof candidate.quantity !== "number" ||
            !Number.isInteger(candidate.quantity) ||
            candidate.quantity < 1
          ) {
            return null;
          }

          return {
            productId: candidate.productId,
            quantity: candidate.quantity,
          };
        })
        .filter((item): item is CheckoutItemDto => item !== null);
    } catch {
      return [];
    }
  }

  private async upsertPaymentRecord(
    orderId: string,
    stripeIntentId: string,
    amount: number,
    status: PaymentStatus,
    client?: Prisma.TransactionClient,
  ) {
    const db = client || this.prismaService;
    const existing = await db.payment.findFirst({
      where: { orderId },
    });

    if (existing) {
      await db.payment.update({
        where: { id: existing.id },
        data: { status, stripeIntentId, amount },
      });
      return;
    }

    await db.payment.create({
      data: {
        orderId,
        stripeIntentId,
        amount,
        status,
      },
    });
  }

  private async retrievePaymentIntent(paymentIntentId: string) {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      throw new BadRequestException("Invalid payment intent");
    }
  }

  private assertPaymentAccess(
    paymentIntent: Stripe.PaymentIntent,
    userId: string,
    isAdmin: boolean,
  ) {
    if (isAdmin) {
      return;
    }

    if (paymentIntent.metadata?.userId !== userId) {
      throw new ForbiddenException("Not authorized for this payment");
    }
  }

  private mapStripePaymentStatus(
    stripeStatus: Stripe.PaymentIntent.Status,
  ): PaymentStatus {
    switch (stripeStatus) {
      case "succeeded":
        return PaymentStatus.SUCCEEDED;
      case "canceled":
        return PaymentStatus.FAILED;
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
      case "processing":
      case "requires_capture":
      default:
        return PaymentStatus.PENDING;
    }
  }
}

