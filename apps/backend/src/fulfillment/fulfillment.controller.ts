import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import {
  FulfillmentService,
  type FulfillmentQueueQuery,
} from "./fulfillment.service";

@Controller("admin/operations/fulfillment")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Get("summary")
  async getSummary() {
    return this.fulfillmentService.getOperationsSummary();
  }

  @Get("queue")
  async getQueue(@Query() query: FulfillmentQueueQuery) {
    return this.fulfillmentService.getFulfillmentQueue(query);
  }

  @Get("events")
  async getEvents(@Query() query: PaginationQuery) {
    return this.fulfillmentService.getFulfillmentEvents(query);
  }

  @Post("run")
  async runAutomation(@CurrentUser() user: AuthenticatedUser) {
    return this.fulfillmentService.advanceFulfillment({
      force: true,
      actorId: user.id,
      source: "ADMIN",
    });
  }

  @Post("orders/:orderId/status")
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() body: { status: string; trackingId?: string },
  ) {
    return this.fulfillmentService.updateFulfillmentStatus(
      orderId,
      body.status,
      user.id,
      body.trackingId,
    );
  }
}
