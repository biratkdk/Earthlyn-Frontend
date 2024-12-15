import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import {
  type NotificationQuery,
  NotificationsService,
} from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: NotificationQuery,
  ) {
    return this.notificationsService.list(req.user.id, query);
  }

  @Get("unread-count")
  async unreadCount(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.unreadCount(req.user.id);
  }

  @Post("read-all")
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Post(":id/read")
  async markAsRead(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }
}
