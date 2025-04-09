import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../database/prisma.service";
import { CreatePrivacySettingsDto } from "./dto/create-privacy-settings.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import { SAFE_USER_SELECT } from "../common/prisma-selects";

const EXPORT_EXPIRY_DAYS = 30;
const ACCOUNT_DELETION_GRACE_DAYS = 7;

@Injectable()
export class PrivacyService {
  constructor(private prisma: PrismaService) {}

  async getPrivacySettings(userId: string) {
    return this.withDeletionSchedule(await this.ensurePrivacySettings(userId));
  }

  async updatePrivacySettings(userId: string, dto: CreatePrivacySettingsDto) {
    const updateData = this.getPrivacyUpdateData(dto);
    const settings = await this.prisma.privacySettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });
    return this.withDeletionSchedule(settings);
  }

  async requestDataExport(userId: string) {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    const exportLog = await this.prisma.dataExportLog.create({
      data: {
        userId,
        format: "JSON",
        expiresAt,
        downloadUrl: "pending",
      },
    });

    return this.prisma.dataExportLog.update({
      where: { id: exportLog.id },
      data: {
        downloadUrl: `/privacy/exports/${exportLog.id}/download`,
        expiresAt,
      },
    });
  }

  async getDataExports(userId: string, query: PaginationQuery = {}) {
    const pagination = getPaginationParams(query);
    const where = { userId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.dataExportLog.findMany({
        where,
        orderBy: { exportedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.dataExportLog.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async downloadDataExport(userId: string, exportId: string) {
    const exportLog = await this.prisma.dataExportLog.findFirst({
      where: { id: exportId, userId },
    });

    if (!exportLog) {
      throw new NotFoundException("Data export not found");
    }

    if (exportLog.expiresAt.getTime() <= Date.now()) {
      throw new GoneException("Data export has expired");
    }

    const payload = await this.buildDataExportPayload(userId, exportLog.id);
    await this.prisma.dataExportLog.update({
      where: { id: exportLog.id },
      data: { downloadedAt: new Date() },
    });

    return payload;
  }

  async requestAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException("Account is not active");
    }

    const deletionRequested = new Date();
    const settings = await this.prisma.privacySettings.upsert({
      where: { userId },
      update: {
        deletionRequested,
        deletionAt: null,
      },
      create: {
        userId,
        deletionRequested,
      },
    });

    return this.withDeletionSchedule(settings);
  }

  async cancelDeletionRequest(userId: string) {
    const settings = await this.prisma.privacySettings.upsert({
      where: { userId },
      update: {
        deletionRequested: null,
        deletionAt: null,
      },
      create: {
        userId,
      },
    });
    return this.withDeletionSchedule(settings);
  }

  async getPendingDeletions(
    daysUntilDeletion: number = ACCOUNT_DELETION_GRACE_DAYS,
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysUntilDeletion);
    return this.prisma.privacySettings.findMany({
      where: {
        deletionRequested: {
          not: null,
          lte: cutoffDate,
        },
        deletionAt: null,
      },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processDueDeletionRequests() {
    const pendingDeletions = await this.getPendingDeletions();
    for (const deletion of pendingDeletions) {
      await this.deleteUserData(deletion.userId);
    }

    return { processed: pendingDeletions.length };
  }

  async deleteUserData(userId: string) {
    const anonymizedEmail = `deleted-${userId}@deleted.earthlyn.local`;
    const deletedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      await tx.message.updateMany({
        where: { senderId: userId },
        data: { content: "[deleted by user]", isRead: true, readAt: deletedAt },
      });

      await tx.ticket.updateMany({
        where: { userId },
        data: {
          description: "[deleted by user]",
          resolution: "User account was deleted under privacy request.",
        },
      });

      await tx.ticketResponse.updateMany({
        where: { userId },
        data: { message: "[deleted by user]" },
      });

      await tx.privacySettings.upsert({
        where: { userId },
        update: { deletionAt: deletedAt },
        create: { userId, deletionAt: deletedAt },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: "Deleted user",
          passwordHash: "deleted",
          isActive: false,
        },
        select: { id: true, email: true, isActive: true },
      });
    });
  }

  private async ensurePrivacySettings(userId: string) {
    return this.prisma.privacySettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  private getPrivacyUpdateData(dto: CreatePrivacySettingsDto) {
    return {
      ...(dto.dataCollection !== undefined
        ? { dataCollection: dto.dataCollection }
        : {}),
      ...(dto.marketing !== undefined ? { marketing: dto.marketing } : {}),
      ...(dto.analytics !== undefined ? { analytics: dto.analytics } : {}),
    };
  }

  private getDeletionScheduledAt(deletionRequested: Date) {
    return new Date(
      deletionRequested.getTime() +
        ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
  }

  private withDeletionSchedule<T extends { deletionRequested?: Date | null }>(
    settings: T,
  ) {
    return {
      ...settings,
      deletionScheduledAt: settings.deletionRequested
        ? this.getDeletionScheduledAt(settings.deletionRequested)
        : null,
      gracePeriodDays: ACCOUNT_DELETION_GRACE_DAYS,
    };
  }

  private async buildDataExportPayload(userId: string, exportId: string) {
    const [
      user,
      privacySettings,
      buyerProfile,
      sellerProfile,
      orders,
      transactions,
      messagesSent,
      messagesReceived,
      ecoImpacts,
      productReviews,
      referralsMade,
      referralsReceived,
      subscriptions,
      disputesOpened,
      tickets,
      notifications,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          balance: true,
          ecoPoints: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.privacySettings.findUnique({ where: { userId } }),
      this.prisma.buyer.findUnique({ where: { userId } }),
      this.prisma.seller.findUnique({
        where: { userId },
        include: { kycDocuments: true },
      }),
      this.prisma.order.findMany({
        where: { buyerId: userId },
        include: {
          product: {
            select: { id: true, name: true, category: true, sellerId: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.message.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.message.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.ecoImpact.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.productReview.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.referral.findMany({
        where: { refereeId: userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.dispute.findMany({
        where: { openedById: userId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.ticket.findMany({
        where: { userId },
        include: { responses: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      exportId,
      generatedAt: new Date().toISOString(),
      format: "JSON",
      retention: {
        exportExpiresInDays: EXPORT_EXPIRY_DAYS,
        deletionGracePeriodDays: ACCOUNT_DELETION_GRACE_DAYS,
      },
      user,
      privacySettings,
      profiles: {
        buyer: buyerProfile,
        seller: sellerProfile,
      },
      marketplaceActivity: {
        orders,
        transactions,
        ecoImpacts,
        productReviews,
        referralsMade,
        referralsReceived,
        subscriptions,
        disputesOpened,
        tickets,
        notifications,
      },
      communications: {
        messagesSent,
        messagesReceived,
      },
    };
  }
}

