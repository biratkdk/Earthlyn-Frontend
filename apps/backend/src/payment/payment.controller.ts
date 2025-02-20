import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Req,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { CreatePaymentIntentDto } from "./dto/create-payment-intent.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import type {
  AuthenticatedRequest,
  StripeWebhookRequest,
} from "../common/types/authenticated-request";

@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("create-intent")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async createPaymentIntent(
    @Request() req: AuthenticatedRequest,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return await this.paymentService.createPaymentIntent(
      createPaymentIntentDto,
      req.user.id,
    );
  }

  @Get(":paymentIntentId/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async getPaymentStatus(
    @Request() req: AuthenticatedRequest,
    @Param("paymentIntentId") paymentIntentId: string,
  ) {
    return await this.paymentService.getPaymentIntentStatus(
      paymentIntentId,
      req.user.id,
      req.user.role === UserRole.ADMIN,
    );
  }

  @Post(":paymentIntentId/confirm")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async confirmPayment(
    @Request() req: AuthenticatedRequest,
    @Param("paymentIntentId") paymentIntentId: string,
  ) {
    return await this.paymentService.confirmPaymentIntent(
      paymentIntentId,
      req.user.id,
      req.user.role === UserRole.ADMIN,
    );
  }

  @Post(":paymentIntentId/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async refundPayment(
    @Request() req: AuthenticatedRequest,
    @Param("paymentIntentId") paymentIntentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return await this.paymentService.refundPayment(
      paymentIntentId,
      dto.amount,
      dto.idempotencyKey,
      { adminId: req.user.id, reason: dto.reason },
    );
  }

  @Post("webhook")
  async webhook(@Req() req: StripeWebhookRequest) {
    const signature = req.headers["stripe-signature"];
    return this.paymentService.handleWebhook(req.rawBody, signature);
  }
}

