import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { TicketType, TicketPriority, TicketStatus } from "@prisma/client";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

@Injectable()
export class CustomerServiceService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    return this.prisma.ticket.create({
      data: {
        userId,
        issueType: dto.issueType as TicketType,
        subject: dto.subject,
        description: dto.description,
        status: "OPEN" as TicketStatus,
        priority: (dto.priority || "MEDIUM") as TicketPriority,
      },
    });
  }

  async getTickets(userId: string, query?: PaginationQuery) {
    const pagination = getPaginationParams(query);
    const where = { userId };
    const [items, totalItems] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: { responses: true },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async getTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { responses: { orderBy: { createdAt: "asc" } } },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    return ticket;
  }

  async updateTicketStatus(id: string, status: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: { status: status as TicketStatus },
    });
  }

  async addResponse(ticketId: string, userId: string, message: string) {
    return this.prisma.ticketResponse.create({
      data: {
        ticketId,
        userId,
        message,
      },
    });
  }

  async getOpenTickets(query?: PaginationQuery) {
    const pagination = getPaginationParams(query);
    const where = {
      status: { in: ["OPEN", "IN_PROGRESS"] as TicketStatus[] },
    };
    const [items, totalItems] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async assignTicket(ticketId: string, csUserId: string) {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { csUserId, status: "IN_PROGRESS" as TicketStatus },
    });
  }
}
