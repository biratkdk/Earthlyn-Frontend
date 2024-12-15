import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { MessageModerationService } from "./message-moderation.service";
import type { PaginationQuery } from "../common/pagination";

@Controller("messages/moderation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CUSTOMER_SERVICE)
export class MessageModerationController {
  constructor(private readonly service: MessageModerationService) {}

  @Post(":messageId/flag")
  async flagMessage(
    @Request() req,
    @Param("messageId") messageId: string,
    @Body() body: { reason: string },
  ) {
    return this.service.flagMessage(req.user.id, messageId, body.reason);
  }

  @Get("flagged")
  async getFlagged(@Query() query: PaginationQuery) {
    return this.service.getFlaggedMessages(query);
  }

  @Post(":messageId/resolve")
  async resolve(@Param("messageId") messageId: string) {
    return this.service.resolveFlag(messageId);
  }

  @Post(":userId/block")
  async blockUser(
    @Param("userId") userId: string,
    @Body() body: { reason: string },
  ) {
    return this.service.blockUser(userId, body.reason);
  }

  @Get("abuse-reports")
  async getReports(@Query() query: PaginationQuery) {
    return this.service.getAbuseReports(query);
  }
}
