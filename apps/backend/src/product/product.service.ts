import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApprovalStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { CreateProductReviewDto } from "./dto/create-product-review.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

export type CreateProductInput = CreateProductDto & {
  sellerUserId?: string;
};

export type ProductCatalogQuery = PaginationQuery & {
  search?: string;
  category?: string;
  minEcoScore?: string | number;
  minPrice?: string | number;
  maxPrice?: string | number;
  sortBy?: string;
};

export type ProductMineQuery = PaginationQuery & {
  search?: string;
  status?: string;
  sortBy?: string;
};

@Injectable()
export class ProductService {
  private readonly productInclude = {
    seller: {
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    },
  } as const;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(data: CreateProductInput) {
    const sellerLookup = data.sellerId
      ? { id: data.sellerId }
      : { userId: data.sellerUserId };
    const seller = await this.prisma.seller.findUnique({
      where: sellerLookup,
      select: {
        id: true,
        userId: true,
        kycStatus: true,
        tier: true,
        isVerified: true,
      },
    });
    if (!seller) throw new NotFoundException("Seller not found");
    if (seller.kycStatus !== "APPROVED") {
      throw new BadRequestException("Seller KYC not approved");
    }
    const autoApprove =
      seller.isVerified ||
      ["BLOOM", "EVERGREEN", "EARTH_GUARDIAN"].includes(seller.tier);

    const processingFeeRate =
      this.configService.get<number>("commerce.processingFeeRate") ?? 0.05;
    const processingFee = Number(
      (Number(data.price || 0) * processingFeeRate).toFixed(2),
    );

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: seller.userId },
        select: { balance: true },
      });
      if (!user) throw new NotFoundException("Seller user not found");
      if (Number(user.balance) < processingFee) {
        throw new BadRequestException(
          "Insufficient balance for processing fee",
        );
      }

      const product = await tx.product.create({
        data: {
          name: data.name,
          price: Number(data.price),
          stock: Number(data.stock || 0),
          sellerId: seller.id,
          description: data.description || "",
          ecoScore: Number(data.ecoScore || 0),
          category: data.category || "other",
          imageUrl: data.imageUrl || null,
          processingFee,
          approvalStatus: autoApprove ? "APPROVED" : "PENDING",
          approvedAt: autoApprove ? new Date() : null,
        },
        include: this.productInclude,
      });

      await tx.transaction.create({
        data: {
          userId: seller.userId,
          amount: processingFee,
          type: "DEBIT",
          description: `Processing fee for product ${product.id}`,
          referenceType: "PRODUCT_LISTING_FEE",
          referenceId: product.id,
        },
      });

      await tx.user.update({
        where: { id: seller.userId },
        data: { balance: Number(user.balance) - processingFee },
      });

      return product;
    });
  }

  private getPublicOrderBy(sortBy?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sortBy) {
      case "name-asc":
        return { name: "asc" };
      case "price-asc":
        return { price: "asc" };
      case "price-desc":
        return { price: "desc" };
      case "eco-desc":
        return { ecoScore: "desc" };
      case "created-desc":
      case "newest":
      default:
        return { createdAt: "desc" };
    }
  }

  private toFiniteNumber(value: string | number | undefined) {
    if (value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getPublicFilters(query: ProductCatalogQuery = {}) {
    const where: Prisma.ProductWhereInput = { approvalStatus: "APPROVED" };
    const search = query.search?.trim();
    const minEcoScore = this.toFiniteNumber(query.minEcoScore);
    const minPrice = this.toFiniteNumber(query.minPrice);
    const maxPrice = this.toFiniteNumber(query.maxPrice);

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (query.category && query.category !== "all") {
      where.category = query.category;
    }

    if (minEcoScore !== undefined) {
      where.ecoScore = { gte: minEcoScore };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    return where;
  }

  async findAll(
    filters?: Prisma.ProductWhereInput,
    paginationQuery?: PaginationQuery,
    orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" },
  ) {
    const pagination = getPaginationParams(paginationQuery);
    const where = filters || {};
    const [items, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: this.productInclude,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async findAllPublic(query?: ProductCatalogQuery) {
    return this.findAll(
      this.getPublicFilters(query),
      query,
      this.getPublicOrderBy(query?.sortBy),
    );
  }

  async suggest(q: string, limit = 5) {
    if (!q || q.trim().length < 2) return [];
    const results = await this.prisma.product.findMany({
      where: {
        approvalStatus: "APPROVED",
        OR: [
          { name: { contains: q.trim(), mode: "insensitive" } },
          { category: { contains: q.trim(), mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, category: true, price: true, imageUrl: true },
      orderBy: { ecoScore: "desc" },
      take: limit,
    });
    return results;
  }

  async findPublicCategories() {
    const categories = await this.prisma.product.groupBy({
      by: ["category"],
      where: { approvalStatus: "APPROVED" },
      orderBy: { category: "asc" },
    });

    return categories.map((row) => row.category);
  }

  async findRecommendationsForBuyer(userId: string, limit: number = 6) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      select: {
        productId: true,
        product: { select: { category: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const preferredCategories = new Set(
      orders
        .map((order) => order.product?.category)
        .filter((category): category is string => Boolean(category)),
    );
    const purchasedProductIds = new Set(orders.map((order) => order.productId));

    const candidates = await this.prisma.product.findMany({
      where: {
        approvalStatus: "APPROVED",
        stock: { gt: 0 },
      },
      include: this.productInclude,
      orderBy: { ecoScore: "desc" },
      take: Math.max(limit * 5, limit),
    });

    return candidates
      .sort((a, b) => {
        const scoreA =
          Number(a.ecoScore || 0) +
          (preferredCategories.has(a.category) ? 25 : 0) -
          (purchasedProductIds.has(a.id) ? 10 : 0);
        const scoreB =
          Number(b.ecoScore || 0) +
          (preferredCategories.has(b.category) ? 25 : 0) -
          (purchasedProductIds.has(b.id) ? 10 : 0);

        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  async findBySellerUserId(userId: string, paginationQuery?: PaginationQuery) {
    const query = paginationQuery as ProductMineQuery | undefined;
    const where: Prisma.ProductWhereInput = { seller: { userId } };
    const search = query?.search?.trim();

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    if (
      query?.status &&
      query.status !== "all" &&
      Object.values(ApprovalStatus).includes(query.status as ApprovalStatus)
    ) {
      where.approvalStatus = query.status as ApprovalStatus;
    }

    return this.findAll(where, query, this.getPublicOrderBy(query?.sortBy));
  }

  async findPublicById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, approvalStatus: "APPROVED" },
      include: this.productInclude,
    });
  }

  async getReviews(productId: string) {
    const [items, summary] = await Promise.all([
      this.prisma.productReview.findMany({
        where: { productId },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.productReview.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      items,
      summary: {
        averageRating: Number(summary._avg.rating || 0),
        totalReviews: summary._count._all,
      },
    };
  }

  async createReview(
    productId: string,
    userId: string,
    dto: CreateProductReviewDto,
  ) {
    const product = await this.findPublicById(productId);
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        productId,
        buyerId: userId,
        status: "DELIVERED",
      },
      select: { id: true },
    });

    if (!deliveredOrder) {
      throw new BadRequestException("Only buyers with delivered orders can review this product");
    }

    return this.prisma.productReview.upsert({
      where: { userId_productId: { userId, productId } },
      create: {
        userId,
        productId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      update: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude,
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: this.productInclude,
    });
  }

  async delete(id: string) {
    const orderCount = await this.prisma.order.count({
      where: { productId: id },
    });
    if (orderCount > 0) {
      throw new BadRequestException(
        "Products with existing orders cannot be deleted. Set stock to 0 instead.",
      );
    }

    return this.prisma.product.delete({ where: { id } });
  }
}

