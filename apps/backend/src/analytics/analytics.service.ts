import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private getDateFrom(days?: number) {
    return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
  }

  private getCreatedAtFilter(days?: number) {
    const dateFrom = this.getDateFrom(days);
    return dateFrom ? { createdAt: { gte: dateFrom } } : {};
  }

  private getSafeLimit(limit: number, fallback: number = 10) {
    if (!Number.isFinite(limit) || limit < 1) {
      return fallback;
    }

    return Math.min(Math.floor(limit), 100);
  }

  async getDashboardStats(days?: number) {
    const createdAtFilter = this.getCreatedAtFilter(days);
    const totalRevenue = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: "DELIVERED", ...createdAtFilter },
    });

    const totalOrders = await this.prisma.order.count({ where: createdAtFilter });
    const totalUsers = await this.prisma.buyer.count({ where: createdAtFilter });
    const totalSellers = await this.prisma.seller.count({ where: createdAtFilter });

    return {
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalOrders,
      totalUsers,
      totalSellers,
    };
  }

  async getTopSellers(limit: number = 10, days?: number) {
    const createdAtFilter = this.getCreatedAtFilter(days);
    const safeLimit = this.getSafeLimit(limit);

    if (days) {
      const sellerProductCounts = await this.prisma.product.groupBy({
        by: ["sellerId"],
        where: createdAtFilter,
        _count: { sellerId: true },
        orderBy: { _count: { sellerId: "desc" } },
        take: safeLimit,
      });

      const sellerIds = sellerProductCounts.map((row) => row.sellerId);
      const sellers = await this.prisma.seller.findMany({
        where: { id: { in: sellerIds } },
        include: { products: { where: createdAtFilter, take: 5 } },
      });
      const sellersById = new Map(sellers.map((seller) => [seller.id, seller]));

      return sellerIds
        .map((sellerId) => sellersById.get(sellerId))
        .filter((seller) => Boolean(seller));
    }

    return await this.prisma.seller.findMany({
      include: { products: { take: 5 } },
      take: safeLimit,
      orderBy: { products: { _count: "desc" } },
    });
  }

  async getRevenueTrends(days: number = 30) {
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = { createdAt: { gte: dateFrom } };
    const [totalRevenue, ordersCount] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      period: days,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      ordersCount,
    };
  }

  async getUserGrowth(days: number = 30) {
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const newUsers = await this.prisma.buyer.count({
      where: { createdAt: { gte: dateFrom } },
    });

    const newSellers = await this.prisma.seller.count({
      where: { createdAt: { gte: dateFrom } },
    });

    return { newUsers, newSellers, period: days };
  }

  async getEcoImpactStats(days?: number) {
    const createdAtFilter = this.getCreatedAtFilter(days);
    const ecoFriendlyProducts = await this.prisma.product.count({
      where: { ecoScore: { gt: 0 }, ...createdAtFilter },
    });
    const ecoImpactAgg = await this.prisma.ecoImpact.aggregate({
      _sum: { pointsEarned: true },
      _count: { _all: true },
      where: createdAtFilter,
    });
    const totalPoints = Number(ecoImpactAgg._sum.pointsEarned || 0);

    return {
      ecoFriendlyProducts,
      carbonSaved: Math.floor(totalPoints * 0.2),
      treesPlanted: Math.floor(totalPoints / 50),
    };
  }

  async getProductStats(days?: number) {
    const createdAtFilter = this.getCreatedAtFilter(days);

    return {
      pending: await this.prisma.product.count({
        where: { approvalStatus: "PENDING", ...createdAtFilter },
      }),
      approved: await this.prisma.product.count({
        where: { approvalStatus: "APPROVED", ...createdAtFilter },
      }),
      rejected: await this.prisma.product.count({
        where: { approvalStatus: "REJECTED", ...createdAtFilter },
      }),
      total: await this.prisma.product.count({ where: createdAtFilter }),
    };
  }

  async getReferralStats(days?: number) {
    const createdAtFilter = this.getCreatedAtFilter(days);
    const total = await this.prisma.referral.count({ where: createdAtFilter });
    const pending = await this.prisma.referral.count({
      where: { status: "PENDING", ...createdAtFilter },
    });
    const completed = await this.prisma.referral.count({
      where: { status: "COMPLETED", ...createdAtFilter },
    });
    return { total, pending, completed };
  }

  async getSubscriptionStats(days?: number) {
    const createdAtFilter = this.getCreatedAtFilter(days);
    const total = await this.prisma.subscription.count({ where: createdAtFilter });
    const active = await this.prisma.subscription.count({
      where: { status: "ACTIVE", ...createdAtFilter },
    });
    const cancelled = await this.prisma.subscription.count({
      where: { status: "CANCELLED", ...createdAtFilter },
    });
    const expired = await this.prisma.subscription.count({
      where: { status: "EXPIRED", ...createdAtFilter },
    });
    return { total, active, cancelled, expired };
  }

  async getBuyerRetention(days?: number) {
    const createdAtFilter = this.getCreatedAtFilter(days);
    const [totalBuyers, repeatBuyerGroups] = await Promise.all([
      this.prisma.user.count({
        where: { role: "BUYER", ...createdAtFilter },
      }),
      this.prisma.order.groupBy({
        by: ["buyerId"],
        where: {
          ...createdAtFilter,
          buyer: { role: "BUYER", ...createdAtFilter },
        },
        _count: { _all: true },
      }),
    ]);
    const repeatBuyers = repeatBuyerGroups.filter(
      (buyer) => buyer._count._all >= 2,
    ).length;

    return { totalBuyers, repeatBuyers };
  }

  async getTopCategories(limit: number = 10, days?: number) {
    const dateFrom = this.getDateFrom(days);
    const safeLimit = this.getSafeLimit(limit);
    if (dateFrom) {
      const categories = await this.prisma.product.groupBy({
        by: ["category"],
        where: { createdAt: { gte: dateFrom } },
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
        take: safeLimit,
      });

      return categories.map((row) => ({
        category: row.category,
        count: row._count.category,
      }));
    }

    const rows: Array<{ category: string; count: bigint }> = await this.prisma
      .$queryRaw`SELECT category, COUNT(*)::bigint AS count FROM products GROUP BY category ORDER BY count DESC LIMIT ${safeLimit}`;
    return rows.map((r) => ({ category: r.category, count: Number(r.count) }));
  }
}
