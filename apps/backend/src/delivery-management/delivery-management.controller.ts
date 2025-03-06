import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { DeliveryStatus } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { DeliveryManagementService } from "./delivery-management.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";

@Controller("seller/delivery")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class DeliveryManagementController {
  constructor(private readonly service: DeliveryManagementService) {}

  @Get("orders")
  async getOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: string,
    @Query() query?: PaginationQuery,
  ) {
    const statusEnum = status
      ? DeliveryStatus[status as keyof typeof DeliveryStatus]
      : undefined;
    return this.service.getOrdersByStatus(user.id, statusEnum, query);
  }

  @Post(":orderId/update-status")
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: { status: string; trackingId?: string },
  ) {
    const status = DeliveryStatus[body.status as keyof typeof DeliveryStatus];
    return this.service.updateDeliveryStatus(orderId, status, body.trackingId, {
      sellerUserId: user.role === UserRole.SELLER ? user.id : undefined,
      actorUserId: user.id,
      source: user.role === UserRole.ADMIN ? "ADMIN" : "SELLER",
      note:
        user.role === UserRole.ADMIN
          ? "Admin operations update"
          : "Seller delivery update",
    });
  }

  @Get("stats")
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getDeliveryStats(user.id);
  }

  @Get(":orderId/track")
  async trackOrder(@Param("orderId") orderId: string) {
    return this.service.trackOrder(orderId);
  }
}

