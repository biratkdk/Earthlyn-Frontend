import { Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

@Injectable()
export class ProductApprovalService {
  constructor(private prisma: PrismaService) {}

  async getPendingProducts(query?: PaginationQuery) {
    return this.getProductsByApprovalStatus("PENDING", query);
  }

  async getApprovedProducts(query?: PaginationQuery) {
    return this.getProductsByApprovalStatus("APPROVED", query);
  }

  async getRejectedProducts(query?: PaginationQuery) {
    return this.getProductsByApprovalStatus("REJECTED", query);
  }

  async approveProduct(adminId: string, productId: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException("Product not found");
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { approvalStatus: "APPROVED", approvedAt: new Date() },
      });

      await tx.adminAudit.create({
        data: {
          adminId,
          action: "APPROVE_PRODUCT",
          entityType: "PRODUCT",
          entityId: productId,
          metadata: { previousStatus: product.approvalStatus },
        },
      });

      return updated;
    });
  }

  async rejectProduct(adminId: string, productId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException("Product not found");
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { approvalStatus: "REJECTED" },
      });

      await tx.adminAudit.create({
        data: {
          adminId,
          action: "REJECT_PRODUCT",
          entityType: "PRODUCT",
          entityId: productId,
          metadata: { previousStatus: product.approvalStatus, reason },
        },
      });

      return updated;
    });
  }

  async getProductStats() {
    return {
      pending: await this.prisma.product.count({
        where: { approvalStatus: "PENDING" },
      }),
      approved: await this.prisma.product.count({
        where: { approvalStatus: "APPROVED" },
      }),
      rejected: await this.prisma.product.count({
        where: { approvalStatus: "REJECTED" },
      }),
      total: await this.prisma.product.count(),
    };
  }

  private async getProductsByApprovalStatus(
    approvalStatus: ApprovalStatus,
    query?: PaginationQuery,
  ) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const where = { approvalStatus };
    const [items, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          seller: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }
}

