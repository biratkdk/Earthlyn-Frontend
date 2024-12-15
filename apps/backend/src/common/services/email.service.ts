import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendOrderConfirmation(
    to: string,
    orderId: string,
    productName: string,
    totalAmount: number,
    quantity: number,
  ): Promise<void> {
    const subject = `Order Confirmation - Order #${orderId}`;
    const safeOrderId = this.escapeHtml(orderId);
    const htmlContent = `
      <h1>Order Confirmed!</h1>
      <p>Thank you for your purchase.</p>
      <p><strong>Order ID:</strong> ${safeOrderId}</p>
      <p><strong>Product:</strong> ${this.escapeHtml(productName)}</p>
      <p><strong>Quantity:</strong> ${quantity}</p>
      <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
      <p>Your order will be processed shortly.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendOrderShipped(
    to: string,
    orderId: string,
    trackingId: string,
  ): Promise<void> {
    const subject = `Order Shipped - Order #${orderId}`;
    const safeOrderId = this.escapeHtml(orderId);
    const htmlContent = `
      <h1>Your Order Has Shipped!</h1>
      <p>Your order is on its way.</p>
      <p><strong>Order ID:</strong> ${safeOrderId}</p>
      <p><strong>Tracking ID:</strong> ${this.escapeHtml(trackingId)}</p>
      <p>You can track your package using the tracking ID above.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendOrderDelivered(
    to: string,
    orderId: string,
    rewardPoints: number,
  ): Promise<void> {
    const subject = `Order Delivered - Order #${orderId}`;
    const safeOrderId = this.escapeHtml(orderId);
    const htmlContent = `
      <h1>Order Delivered!</h1>
      <p>Your order has been successfully delivered.</p>
      <p><strong>Order ID:</strong> ${safeOrderId}</p>
      <p><strong>Reward Points Earned:</strong> ${rewardPoints}</p>
      <p>Thank you for shopping with us!</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendRefundProcessed(
    to: string,
    orderId: string,
    refundAmount: number,
  ): Promise<void> {
    const subject = `Refund Processed - Order #${orderId}`;
    const safeOrderId = this.escapeHtml(orderId);
    const htmlContent = `
      <h1>Refund Processed</h1>
      <p>Your cancellation refund has been processed.</p>
      <p><strong>Order ID:</strong> ${safeOrderId}</p>
      <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
      <p>The funds will appear according to your payment provider's timing.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendDisputeOpened(
    to: string,
    disputeId: string,
    orderId: string,
    reason: string,
  ): Promise<void> {
    const subject = `Dispute Opened - Dispute #${disputeId}`;
    const htmlContent = `
      <h1>Dispute Has Been Opened</h1>
      <p><strong>Dispute ID:</strong> ${this.escapeHtml(disputeId)}</p>
      <p><strong>Order ID:</strong> ${this.escapeHtml(orderId)}</p>
      <p><strong>Reason:</strong> ${this.escapeHtml(reason)}</p>
      <p>Our team will review your dispute and respond shortly.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendDisputeResolved(
    to: string,
    disputeId: string,
    resolution: string,
  ): Promise<void> {
    const subject = `Dispute Resolved - Dispute #${disputeId}`;
    const htmlContent = `
      <h1>Your Dispute Has Been Resolved</h1>
      <p><strong>Dispute ID:</strong> ${this.escapeHtml(disputeId)}</p>
      <p><strong>Resolution:</strong> ${this.escapeHtml(resolution)}</p>
      <p>Thank you for your patience.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    const subject = "Welcome to EARTHLYN!";
    const htmlContent = `
      <h1>Welcome to EARTHLYN, ${this.escapeHtml(name)}!</h1>
      <p>Thank you for joining our eco-friendly marketplace.</p>
      <p>We're excited to have you be part of our community.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendPaymentConfirmation(
    to: string,
    transactionId: string,
    amount: number,
    paymentMethod: string,
  ): Promise<void> {
    const subject = `Payment Confirmation - ${transactionId}`;
    const htmlContent = `
      <h1>Payment Confirmed</h1>
      <p>Your payment has been confirmed.</p>
      <p><strong>Transaction ID:</strong> ${this.escapeHtml(transactionId)}</p>
      <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
      <p><strong>Payment Method:</strong> ${this.escapeHtml(paymentMethod)}</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const subject = "Password Reset Request";
    const htmlContent = `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <p><a href="${this.safeHttpUrl(resetLink)}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendEmailVerification(
    to: string,
    verificationLink: string,
  ): Promise<void> {
    const subject = "Verify your EARTHLYN email";
    const htmlContent = `
      <h1>Verify your email</h1>
      <p>Click the link below to verify your EARTHLYN account:</p>
      <p><a href="${this.safeHttpUrl(verificationLink)}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
    `;

    await this.send(to, subject, htmlContent);
  }

  private async send(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const apiKey = this.configService.get<string>("SENDGRID_API_KEY");
    const fromEmail = this.configService.get<string>("SENDGRID_FROM_EMAIL");
    const isProduction =
      this.configService.get<string>("NODE_ENV") === "production";

    if (!apiKey || !fromEmail) {
      if (isProduction) {
        throw new Error("Email provider is not configured");
      }

      this.logger.warn(`Email skipped in development. To: ${to}`);
      return;
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Email provider rejected message: ${response.status}`);
      this.logger.debug(errorBody);
      throw new Error("Failed to send email");
    }
  }

  private escapeHtml(value: string) {
    return String(value).replace(/[&<>"']/g, (character) => {
      switch (character) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return character;
      }
    });
  }

  private safeHttpUrl(value: string) {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "#";
      }

      return this.escapeHtml(url.toString());
    } catch {
      return "#";
    }
  }
}
