import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import type { PaginationQuery } from "../common/pagination";

@Controller("subscriptions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get("plans")
  async plans() {
    return this.service.getPlans();
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateSubscriptionDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get("my")
  async mine(@Request() req, @Query() query: PaginationQuery) {
    return this.service.mine(req.user.id, query);
  }

  @Patch(":id/cancel")
  async cancel(@Request() req, @Param("id") id: string) {
    return this.service.cancel(req.user.id, id);
  }
}
