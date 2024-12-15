import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { MessagingService } from "./messaging.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";

@Controller("messages")
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Post()
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    createMessageDto.senderId = req.user.id;
    return this.messagingService.sendMessage(createMessageDto);
  }

  @Get("conversations")
  async getConversations(
    @Req() req: AuthenticatedRequest,
    @Query() query: PaginationQuery,
  ) {
    return this.messagingService.getUserConversations(req.user.id, query);
  }

  @Get("conversation/:otherId")
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param("otherId") otherId: string,
    @Query() query: PaginationQuery,
  ) {
    return this.messagingService.getConversation(req.user.id, otherId, query);
  }

  @Post("conversation/:otherId/read")
  async markConversationAsRead(
    @Req() req: AuthenticatedRequest,
    @Param("otherId") otherId: string,
  ) {
    return this.messagingService.markConversationAsRead(req.user.id, otherId);
  }

  @Post("conversation/:otherId/unread")
  async markConversationAsUnread(
    @Req() req: AuthenticatedRequest,
    @Param("otherId") otherId: string,
  ) {
    return this.messagingService.markConversationAsUnread(req.user.id, otherId);
  }

  @Post(":id/read")
  async markAsRead(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.messagingService.markAsRead(id, req.user.id);
  }
}
