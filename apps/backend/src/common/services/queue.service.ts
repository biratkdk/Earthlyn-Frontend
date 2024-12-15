/**
 * Queue Service
 *
 * Lightweight queue facade used by services without coupling the app to a
 * specific worker backend. Email jobs are dispatched through the configured
 * email provider when EmailService is available, while still returning a job
 * envelope that can be swapped for BullMQ, SQS, or another managed queue.
 */

import { Injectable, Logger, OnModuleDestroy, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker, type JobsOptions } from "bullmq";
import { EmailJobData } from "../jobs/email.job";
import { NotificationJobData } from "../jobs/notification.job";
import { EmailService } from "./email.service";

interface QueuedJob<T> {
  id: string;
  data: T;
  queuedAt: string;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queueDriver: "inline" | "bullmq";
  private readonly queues = new Map<string, Queue>();
  private readonly defaultJobOptions: JobsOptions;
  private emailWorker?: Worker<EmailJobData>;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private emailService?: EmailService,
  ) {
    this.queueDriver =
      this.configService.get<"inline" | "bullmq">("QUEUE_DRIVER") || "inline";
    this.defaultJobOptions = {
      attempts: Number(this.configService.get("QUEUE_JOB_ATTEMPTS") || 3),
      backoff: {
        type: "exponential",
        delay: Number(this.configService.get("QUEUE_JOB_BACKOFF_MS") || 5000),
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    };

    if (this.queueDriver === "bullmq") {
      this.initializeBullWorkers();
    }
  }

  async onModuleDestroy() {
    await Promise.all([
      this.emailWorker?.close(),
      ...Array.from(this.queues.values()).map((queue) => queue.close()),
    ]);
  }

  async addEmailJob(data: EmailJobData): Promise<QueuedJob<EmailJobData>> {
    return this.enqueue("email", data);
  }

  async addOrderConfirmationEmail(
    to: string,
    orderId: string,
    productName: string,
    quantity: number,
    totalAmount: number,
  ) {
    const job = await this.addEmailJob({
      to,
      subject: "Order Confirmation - EARTHLYN",
      template: "order-confirmation",
      context: {
        orderId,
        productName,
        quantity,
        totalAmount,
        orderDate: new Date().toISOString(),
      },
    });

    if (this.emailService && this.queueDriver === "inline") {
      await this.emailService.sendOrderConfirmation(
        to,
        orderId,
        productName,
        totalAmount,
        quantity,
      );
    }

    return job;
  }

  async addDisputeNotificationEmail(
    to: string,
    disputeId: string,
    reason: string,
    orderId: string,
  ) {
    const job = await this.addEmailJob({
      to,
      subject: "Dispute Notification - EARTHLYN",
      template: "dispute-notification",
      context: {
        disputeId,
        reason,
        orderId,
        createdAt: new Date().toISOString(),
      },
    });

    if (this.emailService && this.queueDriver === "inline") {
      await this.emailService.sendDisputeOpened(to, disputeId, orderId, reason);
    }

    return job;
  }

  async addWelcomeEmail(to: string, userName: string) {
    const job = await this.addEmailJob({
      to,
      subject: "Welcome to EARTHLYN",
      template: "welcome",
      context: { userName, joinDate: new Date().toISOString() },
    });

    if (this.emailService && this.queueDriver === "inline") {
      await this.emailService.sendWelcome(to, userName);
    }

    return job;
  }

  async addPaymentConfirmationEmail(
    to: string,
    transactionId: string,
    amount: number,
    paymentMethod: string,
  ) {
    const job = await this.addEmailJob({
      to,
      subject: "Payment Confirmation - EARTHLYN",
      template: "payment-confirmation",
      context: {
        transactionId,
        amount,
        paymentMethod,
        date: new Date().toISOString(),
      },
    });

    if (this.emailService && this.queueDriver === "inline") {
      await this.emailService.sendPaymentConfirmation(
        to,
        transactionId,
        amount,
        paymentMethod,
      );
    }

    return job;
  }

  async addRefundEmail(to: string, orderId: string, refundAmount: number) {
    const job = await this.addEmailJob({
      to,
      subject: "Refund Processed - EARTHLYN",
      template: "refund-confirmation",
      context: {
        orderId,
        refundAmount,
        processedDate: new Date().toISOString(),
      },
    });

    if (this.emailService && this.queueDriver === "inline") {
      await this.emailService.sendRefundProcessed(to, orderId, refundAmount);
    }

    return job;
  }

  async addNotificationJob(
    data: NotificationJobData,
  ): Promise<QueuedJob<NotificationJobData>> {
    return this.enqueue("notifications", data);
  }

  async addOrderStatusNotification(
    userId: string,
    orderId: string,
    status: string,
    deviceTokens?: string[],
  ) {
    return this.addNotificationJob({
      userId,
      title: "Order Update",
      body: this.getStatusMessage(status),
      type: "ORDER",
      deviceTokens,
      data: { orderId, status, notificationType: "ORDER_UPDATE" },
    });
  }

  async addMessageNotification(
    userId: string,
    senderId: string,
    senderName: string,
    messagePreview: string,
    deviceTokens?: string[],
  ) {
    return this.addNotificationJob({
      userId,
      title: `New message from ${senderName}`,
      body: messagePreview,
      type: "MESSAGE",
      deviceTokens,
      data: { senderId, notificationType: "NEW_MESSAGE" },
    });
  }

  async addDisputeNotification(
    userId: string,
    disputeId: string,
    reason: string,
    deviceTokens?: string[],
  ) {
    return this.addNotificationJob({
      userId,
      title: "Dispute Notification",
      body: `A dispute has been raised: ${reason}`,
      type: "ALERT",
      deviceTokens,
      data: { disputeId, reason, notificationType: "DISPUTE_ALERT" },
    });
  }

  async addPaymentNotification(
    userId: string,
    transactionId: string,
    amount: number,
    status: string,
    deviceTokens?: string[],
  ) {
    return this.addNotificationJob({
      userId,
      title: "Payment Update",
      body: `Payment of $${amount} was ${status.toLowerCase()}`,
      type: "ALERT",
      deviceTokens,
      data: {
        transactionId,
        amount,
        status,
        notificationType: "PAYMENT_UPDATE",
      },
    });
  }

  async addPromotionalNotification(
    userId: string,
    title: string,
    message: string,
    promotionId: string,
    deviceTokens?: string[],
  ) {
    return this.addNotificationJob({
      userId,
      title,
      body: message,
      type: "PROMOTION",
      deviceTokens,
      data: { promotionId, notificationType: "PROMOTION" },
    });
  }

  private async enqueue<T>(queueName: string, data: T): Promise<QueuedJob<T>> {
    if (this.queueDriver === "bullmq") {
      const queue = this.getBullQueue<T>(queueName);
      const addJob = queue.add.bind(queue) as (
        name: string,
        payload: T,
        options?: JobsOptions,
      ) => Promise<{ id?: string | number }>;
      const job = await addJob(queueName, data, this.defaultJobOptions);
      this.logger.debug(`Queued ${queueName} job ${job.id}`);
      return {
        id: String(job.id),
        data,
        queuedAt: new Date().toISOString(),
      };
    }

    const job = {
      id: `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      data,
      queuedAt: new Date().toISOString(),
    };
    this.logger.debug(`Queued ${queueName} job ${job.id}`);
    return job;
  }

  private getBullQueue<T>(queueName: string): Queue<T> {
    const fullName = this.getBullQueueName(queueName);
    const existingQueue = this.queues.get(fullName) as Queue<T> | undefined;
    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue<T>(fullName, {
      connection: this.getRedisConnection(),
    });
    this.queues.set(fullName, queue);
    return queue;
  }

  private initializeBullWorkers() {
    if (!this.emailService) {
      this.logger.warn(
        "QUEUE_DRIVER=bullmq is enabled but EmailService is unavailable; email jobs will wait in Redis",
      );
      return;
    }

    this.emailWorker = new Worker<EmailJobData>(
      this.getBullQueueName("email"),
      async (job) => this.processEmailJob(job.data),
      {
        connection: this.getRedisConnection(),
        concurrency: Number(
          this.configService.get("QUEUE_WORKER_CONCURRENCY") || 5,
        ),
      },
    );
    this.emailWorker.on("failed", (job, error) => {
      this.logger.error(
        `Email job ${job?.id || "unknown"} failed: ${error.message}`,
      );
    });
  }

  private getBullQueueName(queueName: string) {
    return `earthlyn-${queueName}`;
  }

  private getRedisConnection() {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);
      const isTls = parsedUrl.protocol === "rediss:";

      return {
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port || (isTls ? 6380 : 6379)),
        username: parsedUrl.username
          ? decodeURIComponent(parsedUrl.username)
          : undefined,
        password: parsedUrl.password
          ? decodeURIComponent(parsedUrl.password)
          : undefined,
        tls: isTls ? {} : undefined,
        maxRetriesPerRequest: null,
      };
    }

    const password = this.configService.get<string>("REDIS_PASSWORD");
    return {
      host: this.configService.get<string>("REDIS_HOST", "localhost"),
      port: Number(this.configService.get("REDIS_PORT") || 6379),
      password: password || undefined,
      maxRetriesPerRequest: null,
    };
  }

  private async processEmailJob(data: EmailJobData) {
    if (!this.emailService) {
      throw new Error("Email service is not configured");
    }

    const context = data.context || {};
    switch (data.template) {
      case "order-confirmation":
        return this.emailService.sendOrderConfirmation(
          data.to,
          this.readString(context.orderId),
          this.readString(context.productName),
          this.readNumber(context.totalAmount),
          this.readNumber(context.quantity),
        );
      case "dispute-notification":
        return this.emailService.sendDisputeOpened(
          data.to,
          this.readString(context.disputeId),
          this.readString(context.orderId),
          this.readString(context.reason),
        );
      case "welcome":
        return this.emailService.sendWelcome(
          data.to,
          this.readString(context.userName),
        );
      case "payment-confirmation":
        return this.emailService.sendPaymentConfirmation(
          data.to,
          this.readString(context.transactionId),
          this.readNumber(context.amount),
          this.readString(context.paymentMethod),
        );
      case "refund-confirmation":
        return this.emailService.sendRefundProcessed(
          data.to,
          this.readString(context.orderId),
          this.readNumber(context.refundAmount),
        );
      default:
        throw new Error(`Unsupported email job template: ${data.template}`);
    }
  }

  private readString(value: unknown) {
    return typeof value === "string" ? value : "";
  }

  private readNumber(value: unknown) {
    return typeof value === "number" ? value : Number(value || 0);
  }

  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      CONFIRMED: "Your order has been confirmed!",
      PENDING: "Your order is waiting for payment",
      PROCESSING: "Your order is being processed",
      IN_TRANSIT: "Your order is on the way!",
      DELIVERED: "Your order has been delivered",
      CANCELLED: "Your order has been cancelled",
    };
    return messages[status] || `Order status: ${status}`;
  }
}
