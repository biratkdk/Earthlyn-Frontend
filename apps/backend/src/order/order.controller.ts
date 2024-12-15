import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderStatus } from "@prisma/client";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/decorators/roles.decorator";
import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import type { Prisma } from "@prisma/client";
import type { OrderListQuery } from "./order.service";

@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.create(req.user.id, createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER_SERVICE)
  findAll(
    @Query("buyerId") buyerId?: string,
    @Query("status") status?: OrderStatus,
    @Query() query?: OrderListQuery,
  ) {
    return this.orderService.findAll({ buyerId, status }, query);
  }

  // Specific routes MUST come before generic :id route
  @Get("buyer/:buyerId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  findByBuyer(
    @Request() req: AuthenticatedRequest,
    @Param("buyerId") buyerId: string,
    @Query() query: OrderListQuery,
  ) {
    if (req.user.role === UserRole.BUYER && req.user.id !== buyerId) {
      throw new ForbiddenException("Cannot access other buyer orders");
    }
    return this.orderService.findByBuyer(buyerId, query);
  }

  @Get("status/:status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER_SERVICE)
  findByStatus(
    @Param("status") status: OrderStatus,
    @Query() query: OrderListQuery,
  ) {
    return this.orderService.findByStatus(status, query);
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async cancelOrder(
    @Request() req: AuthenticatedRequest,
    @Param("id") orderId: string,
  ) {
    return this.orderService.cancelOrder(
      orderId,
      req.user.id,
      req.user.role === UserRole.ADMIN,
    );
  }

  // Generic :id route comes last
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.CUSTOMER_SERVICE,
  )
  async findOne(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    const order = await this.orderService.findOne(id);
    if (req.user.role === UserRole.BUYER && order?.buyerId !== req.user.id) {
      throw new ForbiddenException("Not authorized to view this order");
    }
    if (req.user.role === UserRole.SELLER) {
      const sellerUserId = order?.product?.seller?.userId;
      if (!sellerUserId || sellerUserId !== req.user.id) {
        throw new ForbiddenException("Not authorized to view this order");
      }
    }
    return order;
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  async update(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() data: Prisma.OrderUpdateInput,
  ) {
    if (req.user.role === UserRole.SELLER) {
      const order = await this.orderService.findOne(id);
      const sellerUserId = order?.product?.seller?.userId;
      if (!sellerUserId || sellerUserId !== req.user.id) {
        throw new ForbiddenException("Not authorized to update this order");
      }
    }
    return this.orderService.update(id, data);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.orderService.remove(id);
  }
}
