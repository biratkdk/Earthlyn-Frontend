import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateDisputeDto } from "./dto/create-dispute.dto";
import { UpdateDisputeDto } from "./dto/update-dispute.dto";
import { RespondDisputeDto } from "./dto/respond-dispute.dto";
import { UserRole } from "../common/decorators/roles.decorator";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { DisputeStatus, Prisma } from "@prisma/client";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import { SAFE_USER_SELECT } from "../common/prisma-selects";

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(userId: string, role: UserRole, dto: CreateDisputeDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { product: { include: { seller: true } } },
    });
    if (!order) throw new NotFoundException("Order not found");

    const isBuyer = order.buyerId === userId;
    const isSeller = order.product?.seller?.userId === userId;
    if (!isBuyer && !isSeller && role !== UserRole.ADMIN) {
      throw new ForbiddenException("Not authorized");
    }

    const slaHours = Number(this.configService.get("DISPUTE_SLA_HOURS") || 72);
    const dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const dispute = await this.prisma.dispute.create({
      data: {
        orderId: dto.orderId,
        openedById: userId,
        reason: dto.reason,
        priority: dto.priority,
        dueAt,
      },
    });

    await this.createNotification(
      order.buyerId,
      "DISPUTE_OPENED",
      `Dispute opened for order ${order.id}`,
      { disputeId: dispute.id },
    );
    if (order.product?.seller?.userId) {
      await this.createNotification(
        order.product.seller.userId,
        "DISPUTE_OPENED",
        `Dispute opened for order ${order.id}`,
        { disputeId: dispute.id },
      );
    }
    return dispute;
  }

  async myDisputes(userId: string, query?: PaginationQuery) {
    const pagination = getPaginationParams(query);
    const where = { openedById: userId };
    const [items, totalItems] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: { order: true },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async getForUser(disputeId: string, userId: string, role: UserRole) {
    return this.findAccessibleDispute(disputeId, userId, role);
  }

  async respond(
    disputeId: string,
    userId: string,
    role: UserRole,
    dto: RespondDisputeDto,
  ) {
    const dispute = await this.findAccessibleDispute(disputeId, userId, role);

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.REJECTED
    ) {
      throw new BadRequestException("Closed disputes cannot receive responses");
    }

    await this.prisma.disputeMessage.create({
      data: {
        disputeId,
        userId,
        message: dto.message.trim(),
      },
    });

    if (dispute.status === DisputeStatus.OPEN) {
      await this.prisma.dispute.update({
        where: { id: disputeId },
        data: { status: DisputeStatus.IN_REVIEW },
      });
    }

    const notifyUserIds = new Set<string>();
    notifyUserIds.add(dispute.openedById);

    const sellerUserId = dispute.order.product?.seller?.userId;
    if (sellerUserId) {
      notifyUserIds.add(sellerUserId);
    }

    if (dispute.assignedToId) {
      notifyUserIds.add(dispute.assignedToId);
    }

    notifyUserIds.delete(userId);

    await Promise.all(
      [...notifyUserIds].map((recipientId) =>
        this.createNotification(
          recipientId,
          "DISPUTE_RESPONSE",
          `New response added to dispute ${disputeId}`,
          { disputeId },
        ),
      ),
    );

    return this.findAccessibleDispute(disputeId, userId, role);
  }

  async list(status?: string, query?: PaginationQuery) {
    const disputeStatus = this.parseDisputeStatus(status);
    const pagination = getPaginationParams(query);
    const where = disputeStatus ? { status: disputeStatus } : undefined;

    const [items, totalItems] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          order: true,
          openedBy: { select: SAFE_USER_SELECT },
          assignedTo: { select: SAFE_USER_SELECT },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async update(disputeId: string, resolvedById: string, dto: UpdateDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });
    if (!dispute) throw new NotFoundException("Dispute not found");
    const resolution = dto.resolution?.trim();
    const nextStatus = dto.status ?? dispute.status;

    if (nextStatus === "RESOLVED" && !resolution && !dispute.resolution) {
      throw new BadRequestException(
        "Resolution is required to resolve dispute",
      );
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: nextStatus,
        resolution: resolution ?? dispute.resolution,
        assignedToId: dto.assignedToId ?? dispute.assignedToId,
        resolvedAt: nextStatus === "RESOLVED" ? new Date() : dispute.resolvedAt,
        resolvedById:
          nextStatus === "RESOLVED" ? resolvedById : dispute.resolvedById,
      },
    });
    await this.prisma.adminAudit.create({
      data: {
        adminId: resolvedById,
        action: "UPDATE_DISPUTE",
        entityType: "DISPUTE",
        entityId: disputeId,
        metadata: {
          previousStatus: dispute.status,
          nextStatus,
          assignedToId: updated.assignedToId,
        },
      },
    });

    if (nextStatus === "RESOLVED") {
      await this.createNotification(
        dispute.openedById,
        "DISPUTE_RESOLVED",
        `Dispute ${disputeId} resolved`,
        { disputeId },
      );
    }
    return updated;
  }

  @Cron("*/30 * * * *") // every 30 minutes
  async markOverdue() {
    const now = new Date();
    const overdue = await this.prisma.dispute.findMany({
      where: {
        status: { in: [DisputeStatus.OPEN, DisputeStatus.IN_REVIEW] },
        dueAt: { lte: now },
      },
      orderBy: { dueAt: "asc" },
      take: 100,
    });
    for (const d of overdue) {
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId: d.openedById,
          type: "DISPUTE_OVERDUE",
          message: `Dispute ${d.id} is overdue`,
        },
      });

      if (existingNotification) {
        continue;
      }

      await this.createNotification(
        d.openedById,
        "DISPUTE_OVERDUE",
        `Dispute ${d.id} is overdue`,
        { disputeId: d.id },
      );
    }
  }

  private async createNotification(
    userId: string,
    type: string,
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.notification.create({
      data: { userId, type, message, metadata },
    });
  }

  private parseDisputeStatus(status?: string) {
    if (!status) {
      return undefined;
    }

    return Object.values(DisputeStatus).includes(status as DisputeStatus)
      ? (status as DisputeStatus)
      : undefined;
  }

  private async findAccessibleDispute(
    disputeId: string,
    userId: string,
    role: UserRole,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
        openedBy: { select: SAFE_USER_SELECT },
        assignedTo: { select: SAFE_USER_SELECT },
        resolvedBy: { select: SAFE_USER_SELECT },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException("Dispute not found");
    }

    if (role === UserRole.ADMIN || role === UserRole.CUSTOMER_SERVICE) {
      return dispute;
    }

    const isOpener = dispute.openedById === userId;
    const isSeller = dispute.order.product?.seller?.userId === userId;

    if (!isOpener && !isSeller) {
      throw new ForbiddenException("Not authorized");
    }

    return dispute;
  }
}
