import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { KYCStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  KycDocumentType,
  REQUIRED_KYC_DOCUMENT_TYPES,
  SubmitKycDto,
} from "./dto/submit-kyc.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

export type KycRequestQuery = PaginationQuery & {
  status?: string;
};

@Injectable()
export class SellerKycService {
  constructor(private prisma: PrismaService) {}

  async submitKycDocuments(userId: string, dto: SubmitKycDto) {
    this.validateRequiredDocuments(dto);

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: { _count: { select: { kycDocuments: true } } },
    });
    if (!seller) throw new NotFoundException("Seller not found");

    if (seller.kycStatus === KYCStatus.APPROVED) {
      throw new BadRequestException("Seller KYC is already approved");
    }

    if (
      seller.kycStatus === KYCStatus.PENDING &&
      seller._count.kycDocuments > 0
    ) {
      throw new BadRequestException("Seller KYC is already pending review");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerKycDocument.deleteMany({
        where: { sellerId: seller.id },
      });

      for (const doc of dto.documents) {
        await tx.sellerKycDocument.create({
          data: {
            sellerId: seller.id,
            docType: doc.docType,
            url: doc.url,
            status: "PENDING",
          },
        });
      }

      await tx.seller.update({
        where: { id: seller.id },
        data: {
          kycStatus: KYCStatus.PENDING,
          isVerified: false,
          kycReviewedAt: null,
          kycReviewedById: null,
          kycRejectionReason: null,
        },
      });
    });

    return { submitted: true, count: dto.documents.length };
  }

  private validateRequiredDocuments(dto: SubmitKycDto) {
    this.validateDocumentSet(dto.documents);
  }

  private validateDocumentSet(documents: Array<{ docType: string }>) {
    const submittedTypes = documents.map((document) => document.docType);
    const invalidType = submittedTypes.find(
      (type) => !REQUIRED_KYC_DOCUMENT_TYPES.includes(type as KycDocumentType),
    );

    if (invalidType) {
      throw new BadRequestException(
        `Invalid KYC document type: ${invalidType}`,
      );
    }

    const uniqueTypes = new Set(submittedTypes);

    if (
      submittedTypes.length !== REQUIRED_KYC_DOCUMENT_TYPES.length ||
      uniqueTypes.size !== REQUIRED_KYC_DOCUMENT_TYPES.length
    ) {
      throw new BadRequestException(
        `Submit exactly these KYC document types: ${REQUIRED_KYC_DOCUMENT_TYPES.join(", ")}`,
      );
    }

    const missingTypes = REQUIRED_KYC_DOCUMENT_TYPES.filter(
      (requiredType) => !uniqueTypes.has(requiredType),
    );

    if (missingTypes.length > 0) {
      throw new BadRequestException(
        `Missing KYC document types: ${missingTypes.join(", ")}`,
      );
    }
  }

  async getKycStatus(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      select: {
        kycStatus: true,
        isVerified: true,
        kycRejectionReason: true,
        _count: { select: { kycDocuments: true } },
      },
    });

    if (!seller) return null;

    return {
      kycStatus: seller.kycStatus,
      isVerified: seller.isVerified,
      kycRejectionReason: seller.kycRejectionReason,
      documentsSubmitted: seller._count.kycDocuments > 0,
    };
  }

  async getKycRequests(query: KycRequestQuery = {}) {
    const pagination = getPaginationParams({ pageSize: 10, ...query });
    const where = this.getKycRequestWhere(query.status);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.seller.findMany({
        where,
        include: this.getKycRequestInclude(),
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.seller.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async getPendingKycRequests(query: PaginationQuery = {}) {
    return this.getKycRequests({ ...query, status: KYCStatus.PENDING });
  }

  async getKycRequestDetail(sellerId: string) {
    const [seller, auditLogs] = await Promise.all([
      this.prisma.seller.findUnique({
        where: { id: sellerId },
        include: this.getKycRequestInclude(),
      }),
      this.prisma.adminAudit.findMany({
        where: {
          entityType: "SELLER_KYC",
          entityId: sellerId,
        },
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
      }),
    ]);

    if (!seller) {
      throw new NotFoundException("Seller not found");
    }

    return { ...seller, auditLogs };
  }

  async approveKyc(adminId: string, sellerId: string) {
    return this.reviewKyc({
      adminId,
      sellerId,
      nextStatus: KYCStatus.APPROVED,
    });
  }

  async rejectKyc(adminId: string, sellerId: string, reason?: string) {
    const rejectionReason = reason?.trim();
    if (!rejectionReason) {
      throw new BadRequestException("Rejection reason is required");
    }

    return this.reviewKyc({
      adminId,
      sellerId,
      nextStatus: KYCStatus.REJECTED,
      reason: rejectionReason,
    });
  }

  private getKycRequestWhere(status?: string): Prisma.SellerWhereInput {
    const hasSubmittedDocuments: Prisma.SellerWhereInput = {
      kycDocuments: { some: {} },
    };
    const normalizedStatus = status?.trim().toUpperCase();
    if (normalizedStatus === "ALL") {
      return hasSubmittedDocuments;
    }

    if (
      normalizedStatus &&
      Object.values(KYCStatus).includes(normalizedStatus as KYCStatus)
    ) {
      return {
        ...hasSubmittedDocuments,
        kycStatus: normalizedStatus as KYCStatus,
      };
    }

    return { ...hasSubmittedDocuments, kycStatus: KYCStatus.PENDING };
  }

  private getKycRequestInclude(): Prisma.SellerInclude {
    return {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      },
      kycDocuments: {
        orderBy: { uploadedAt: "desc" },
      },
    };
  }

  private async reviewKyc({
    adminId,
    sellerId,
    nextStatus,
    reason,
  }: {
    adminId: string;
    sellerId: string;
    nextStatus: KYCStatus;
    reason?: string;
  }) {
    const reviewedAt = new Date();
    const isApproved = nextStatus === KYCStatus.APPROVED;

    return this.prisma.$transaction(async (tx) => {
      const seller = await tx.seller.findUnique({
        where: { id: sellerId },
        include: { kycDocuments: true },
      });
      if (!seller) {
        throw new NotFoundException("Seller not found");
      }

      if (seller.kycDocuments.length === 0) {
        throw new BadRequestException("Seller has not submitted KYC documents");
      }

      if (seller.kycStatus !== KYCStatus.PENDING) {
        throw new BadRequestException(
          `Seller KYC is already ${seller.kycStatus.toLowerCase()}`,
        );
      }

      const hasNonPendingDocument = seller.kycDocuments.some(
        (document) => document.status !== KYCStatus.PENDING,
      );
      if (hasNonPendingDocument) {
        throw new BadRequestException(
          "Seller KYC documents are not pending review",
        );
      }

      this.validateDocumentSet(seller.kycDocuments);

      await tx.seller.update({
        where: { id: sellerId },
        data: {
          kycStatus: nextStatus,
          isVerified: isApproved,
          kycReviewedAt: reviewedAt,
          kycReviewedById: adminId,
          kycRejectionReason: isApproved ? null : reason,
        },
      });

      await tx.sellerKycDocument.updateMany({
        where: { sellerId },
        data: {
          status: nextStatus,
          reviewedAt,
          reviewedById: adminId,
          rejectionReason: isApproved ? null : reason,
        },
      });

      await tx.adminAudit.create({
        data: {
          adminId,
          action: isApproved ? "APPROVE_SELLER_KYC" : "REJECT_SELLER_KYC",
          entityType: "SELLER_KYC",
          entityId: sellerId,
          metadata: {
            previousStatus: seller.kycStatus,
            nextStatus,
            reason: reason ?? null,
            documentTypes: seller.kycDocuments.map(
              (document) => document.docType,
            ),
          },
        },
      });

      return tx.seller.findUniqueOrThrow({
        where: { id: sellerId },
        include: this.getKycRequestInclude(),
      });
    });
  }
}

