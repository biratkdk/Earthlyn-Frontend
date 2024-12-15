import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CustomerServiceService } from "./customer-service.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import type { Prisma } from "@prisma/client";
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";

type TicketWithAssignee = Prisma.TicketGetPayload<{
  include: { responses: true };
}>;

@Controller("tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerServiceController {
  constructor(private readonly service: CustomerServiceService) {}

  @Post()
  async createTicket(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateTicketDto,
  ) {
    return this.service.createTicket(req.user.id, dto);
  }

  @Get("my")
  async getMyTickets(
    @Request() req: AuthenticatedRequest,
    @Query() query: PaginationQuery,
  ) {
    return this.service.getTickets(req.user.id, query);
  }

  @Get()
  @Roles(UserRole.CUSTOMER_SERVICE, UserRole.ADMIN)
  async getOpenTickets(@Query() query: PaginationQuery) {
    return this.service.getOpenTickets(query);
  }

  @Get(":id")
  async getTicket(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const ticket = await this.service.getTicket(id);
    this.assertTicketAccess(ticket, req.user);
    return ticket;
  }

  @Patch(":id/status")
  @Roles(UserRole.CUSTOMER_SERVICE, UserRole.ADMIN)
  async updateStatus(
    @Param("id") id: string,
    @Body() { status }: { status: string },
  ) {
    return this.service.updateTicketStatus(id, status);
  }

  @Post(":id/response")
  async addResponse(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Body() { message }: { message: string },
  ) {
    const ticket = await this.service.getTicket(id);
    this.assertTicketAccess(ticket, req.user);
    return this.service.addResponse(id, req.user.id, message);
  }

  @Patch(":id/assign")
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER_SERVICE)
  async assignTicket(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.assignTicket(id, req.user.id);
  }

  private assertTicketAccess(
    ticket: TicketWithAssignee,
    user: AuthenticatedUser,
  ) {
    const canAccess =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.CUSTOMER_SERVICE ||
      ticket?.userId === user.id ||
      ticket?.csUserId === user.id;

    if (!canAccess) {
      throw new ForbiddenException("Not authorized to access this ticket");
    }
  }
}
