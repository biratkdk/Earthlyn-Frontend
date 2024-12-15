import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { KYCStatus, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { ManageBalanceDto } from "./dto/manage-balance.dto";
import { REQUIRED_KYC_DOCUMENT_TYPES } from "../seller-kyc/dto/submit-kyc.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

export type AdminUserQuery = PaginationQuery & {
  search?: string;
  role?: string;
};

export type AdminAuditQuery = PaginationQuery & {
  action?: string;
  entityType?: string;
  adminId?: string;
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const totalOrders = await this.prisma.order.count();
    const totalSellers = await this.prisma.seller.count();
    const totalTransactions = await this.prisma.transaction.count();

    return {
      totalUsers,
      totalOrders,
      totalSellers,
      totalTransactions,
    };
  }

  async getUserList(query?: AdminUserQuery) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const search = query?.search?.trim();
    const role = query?.role?.trim().toUpperCase();
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role as UserRole;
    }
    const [items, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          balance: true,
          emailVerifiedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async approveSeller(adminId: string, sellerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const seller = await tx.seller.findUnique({
        where: { id: sellerId },
        include: { kycDocuments: true },
      });
      if (!seller) throw new NotFoundException("Seller not found");

      if (seller.kycStatus !== KYCStatus.PENDING) {
        throw new BadRequestException(
          `Seller KYC is already ${seller.kycStatus.toLowerCase()}`,
        );
      }

      const submittedTypes = seller.kycDocuments.map(
        (document) => document.docType,
      );
      const uniqueTypes = new Set(submittedTypes);
      const hasRequiredDocumentSet =
        seller.kycDocuments.length === REQUIRED_KYC_DOCUMENT_TYPES.length &&
        uniqueTypes.size === REQUIRED_KYC_DOCUMENT_TYPES.length &&
        REQUIRED_KYC_DOCUMENT_TYPES.every((type) => uniqueTypes.has(type));

      if (!hasRequiredDocumentSet) {
        throw new BadRequestException(
          `Seller must submit ${REQUIRED_KYC_DOCUMENT_TYPES.join(", ")} before approval`,
        );
      }

      const reviewedAt = new Date();
      const updated = await tx.seller.update({
        where: { id: sellerId },
        data: {
          kycStatus: KYCStatus.APPROVED,
          isVerified: true,
          kycReviewedAt: reviewedAt,
          kycReviewedById: adminId,
          kycRejectionReason: null,
        },
      });

      await tx.sellerKycDocument.updateMany({
        where: { sellerId },
        data: {
          status: KYCStatus.APPROVED,
          reviewedAt,
          reviewedById: adminId,
          rejectionReason: null,
        },
      });

      await tx.adminAudit.create({
        data: {
          adminId,
          action: "APPROVE_SELLER_KYC",
          entityType: "SELLER_KYC",
          entityId: sellerId,
          metadata: {
            previousStatus: seller.kycStatus,
            nextStatus: KYCStatus.APPROVED,
            documentTypes: submittedTypes,
            source: "admin-approve-seller",
          },
        },
      });

      return updated;
    });
  }

  async getAuditLogs(query?: AdminAuditQuery) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const where: Prisma.AdminAuditWhereInput = {};
    const action = query?.action?.trim().toUpperCase();
    const entityType = query?.entityType?.trim().toUpperCase();
    const adminId = query?.adminId?.trim();

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (adminId) {
      where.adminId = adminId;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.adminAudit.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.adminAudit.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async manageBalance(adminId: string, manageBalanceDto: ManageBalanceDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: manageBalanceDto.userId },
      });
      if (!user) throw new NotFoundException("User not found");

      const currentBalance = Number(user.balance);
      const newBalance =
        manageBalanceDto.type === "CREDIT"
          ? currentBalance + manageBalanceDto.amount
          : currentBalance - manageBalanceDto.amount;

      if (newBalance < 0) {
        throw new BadRequestException("Balance cannot be negative");
      }

      const transaction = await tx.transaction.create({
        data: {
          userId: manageBalanceDto.userId,
          amount: manageBalanceDto.amount,
          type: manageBalanceDto.type,
          description: manageBalanceDto.reason,
          referenceType: "ADMIN_BALANCE_ADJUSTMENT",
          referenceId: manageBalanceDto.userId,
        },
      });

      await tx.user.update({
        where: { id: manageBalanceDto.userId },
        data: { balance: newBalance },
      });

      await tx.adminAudit.create({
        data: {
          adminId,
          action: "MANAGE_BALANCE",
          entityType: "USER",
          entityId: manageBalanceDto.userId,
          metadata: {
            type: manageBalanceDto.type,
            amount: manageBalanceDto.amount,
            previousBalance: currentBalance,
            newBalance,
            reason: manageBalanceDto.reason,
          },
        },
      });

      return transaction;
    });
  }
}
