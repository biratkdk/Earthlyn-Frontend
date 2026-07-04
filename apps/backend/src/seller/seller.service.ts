import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateSellerDto } from "./dto/create-seller.dto";
import { Prisma, SellerTier, Transaction } from "@prisma/client";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginatedResponse,
  type PaginationQuery,
} from "../common/pagination";
import {
  calculateSellerTier,
  createEmptyProfitByTier,
  getSellerTierRate,
} from "../common/seller-tiers";
import { SAFE_USER_SELECT } from "../common/prisma-selects";

@Injectable()
export class SellerService {
  constructor(private prismaService: PrismaService) {}

  async create(createSellerDto: CreateSellerDto) {
    return this.prismaService.seller.create({ data: { ...createSellerDto } });
  }

  async findAll(query?: PaginationQuery) {
    const pagination = getPaginationParams(query);
    const [items, totalItems] = await Promise.all([
      this.prismaService.seller.findMany({
        include: {
          user: { select: SAFE_USER_SELECT },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prismaService.seller.count(),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async findOne(id: string) {
    return this.prismaService.seller.findUnique({ where: { id } });
  }

  async getPublicStorefront(id: string) {
    const seller = await this.prismaService.seller.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, createdAt: true } },
        products: {
          where: { approvalStatus: "APPROVED" },
          orderBy: { ecoScore: "desc" },
          select: {
            id: true, name: true, description: true, price: true,
            imageUrl: true, ecoScore: true, category: true, stock: true,
          },
        },
      },
    });
    if (!seller) throw new Error("Seller not found");

    const orders = await this.prismaService.order.findMany({
      where: { product: { sellerId: id }, paymentStatus: "SUCCEEDED" },
      select: { totalAmount: true },
    });
    const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const reviews = await this.prismaService.productReview.findMany({
      where: { product: { sellerId: id } },
      select: { rating: true },
    });
    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    return {
      id: seller.id,
      name: seller.user.name,
      tier: seller.tier,
      isVerified: seller.isVerified,
      memberSince: seller.user.createdAt,
      totalSales: Number(totalSales.toFixed(2)),
      totalOrders: orders.length,
      avgRating: avgRating ? Number(avgRating.toFixed(1)) : null,
      reviewCount: reviews.length,
      products: seller.products,
    };
  }

  async findByUserId(userId: string) {
    return this.prismaService.seller.findUnique({
      where: { userId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  async update(id: string, data: Prisma.SellerUpdateInput) {
    return this.prismaService.seller.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prismaService.seller.delete({ where: { id } });
  }

  // Get profit summary for seller
  async getProfitSummary(sellerId: string): Promise<{
    totalSales: number;
    totalEarnings: number;
    profitByTier: { [key in SellerTier]: number };
    currentTier: SellerTier;
    orderCount: number;
  }> {
    const seller = await this.prismaService.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException("Seller not found");
    }

    const profitByTier = createEmptyProfitByTier();

    const deliveredOrders = await this.prismaService.order.findMany({
      where: {
        product: { sellerId },
        status: "DELIVERED",
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        deliveredAt: true,
      },
      orderBy: [{ deliveredAt: "asc" }, { createdAt: "asc" }],
    });

    const deliveryCredits = deliveredOrders.length
      ? await this.prismaService.transaction.findMany({
          where: {
            userId: seller.userId,
            type: "CREDIT",
            referenceType: "ORDER_DELIVERY",
            referenceId: { in: deliveredOrders.map((order) => order.id) },
          },
        })
      : [];

    const creditByOrderId = new Map(
      deliveryCredits
        .filter((transaction) => transaction.referenceId)
        .map((transaction) => [
          transaction.referenceId as string,
          Number(transaction.amount),
        ]),
    );

    let runningSales = 0;
    let totalEarnings = 0;
    for (const order of deliveredOrders) {
      const tierAtDelivery = calculateSellerTier(runningSales);
      const orderTotal = Number(order.totalAmount);
      const creditedProfit =
        creditByOrderId.get(order.id) ??
        Number((orderTotal * getSellerTierRate(tierAtDelivery)).toFixed(2));

      profitByTier[tierAtDelivery] = Number(
        (profitByTier[tierAtDelivery] + creditedProfit).toFixed(2),
      );
      totalEarnings = Number((totalEarnings + creditedProfit).toFixed(2));
      runningSales += orderTotal;
    }

    const orderCount = deliveredOrders.length;

    return {
      totalSales: Number(seller.totalSales),
      totalEarnings,
      profitByTier,
      currentTier: seller.tier,
      orderCount,
    };
  }

  // Get earnings summary for a specific period
  async getEarningsSummary(
    sellerId: string,
    startDate?: Date,
    endDate?: Date,
    paginationQuery?: PaginationQuery,
  ): Promise<{
    totalEarnings: number;
    totalOrders: number;
    averageOrderValue: number;
    transactions: Transaction[];
    transactionsMeta: PaginatedResponse<Transaction>["meta"];
  }> {
    const seller = await this.prismaService.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException("Seller not found");
    }

    const where: Prisma.TransactionWhereInput = {
      userId: seller.userId,
      type: "CREDIT",
      referenceType: "ORDER_DELIVERY",
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const pagination = getPaginationParams({
      pageSize: 10,
      ...paginationQuery,
    });

    const [transactions, earnings, totalOrders] = await Promise.all([
      this.prismaService.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prismaService.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prismaService.transaction.count({ where }),
    ]);

    const totalEarnings = Number(earnings._sum.amount || 0);
    const averageOrderValue = totalOrders > 0 ? totalEarnings / totalOrders : 0;

    return {
      totalEarnings,
      totalOrders,
      averageOrderValue,
      transactions,
      transactionsMeta: buildPaginatedResponse(
        transactions,
        totalOrders,
        pagination,
      ).meta,
    };
  }
}

