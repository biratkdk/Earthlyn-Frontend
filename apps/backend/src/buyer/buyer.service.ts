import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateBuyerDto } from "./dto/create-buyer.dto";
import { Prisma, Transaction, TransactionType } from "@prisma/client";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import { SAFE_USER_SELECT } from "../common/prisma-selects";

@Injectable()
export class BuyerService {
  constructor(private prisma: PrismaService) {}

  async create(createBuyerDto: CreateBuyerDto) {
    return this.prisma.buyer.create({
      data: { userId: createBuyerDto.userId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  async findOne(id: string) {
    return this.prisma.buyer.findUnique({
      where: { id },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.buyer.findUnique({
      where: { userId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  async findAll(query?: PaginationQuery) {
    const pagination = getPaginationParams(query);
    const [items, totalItems] = await Promise.all([
      this.prisma.buyer.findMany({
        include: { user: { select: SAFE_USER_SELECT } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.buyer.count(),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async update(id: string, data: Prisma.BuyerUpdateInput) {
    return this.prisma.buyer.update({
      where: { id },
      data,
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  async remove(id: string) {
    return this.prisma.buyer.delete({
      where: { id },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  // Get buyer's current balance
  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return Number(user.balance);
  }

  // Deposit funds into buyer's wallet
  async depositFunds(
    userId: string,
    amount: number,
    description: string = "Wallet deposit",
  ): Promise<{ newBalance: number; transaction: Transaction }> {
    if (amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const newBalance = Number(user.balance) + amount;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: "CREDIT" as TransactionType,
          amount,
          description,
          referenceType: "WALLET_DEPOSIT",
          referenceId: userId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      return {
        newBalance,
        transaction,
      };
    });
  }

  // Withdraw funds from buyer's wallet
  async withdrawFunds(
    userId: string,
    amount: number,
    description: string = "Wallet withdrawal",
  ): Promise<{ newBalance: number; transaction: Transaction }> {
    if (amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const currentBalance = Number(user.balance);
    if (currentBalance < amount) {
      throw new BadRequestException("Insufficient balance");
    }

    const newBalance = currentBalance - amount;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: "DEBIT" as TransactionType,
          amount,
          description,
          referenceType: "WALLET_WITHDRAWAL",
          referenceId: userId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      return {
        newBalance,
        transaction,
      };
    });
  }

  // Get transaction history for buyer
  async getTransactionHistory(userId: string, query?: PaginationQuery) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const where = { userId };
    const [items, totalItems] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pagination.take,
        skip: pagination.skip,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return buildPaginatedResponse<Transaction>(items, totalItems, pagination);
  }

  async getRewards(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ecoPoints: true,
        orders: {
          select: {
            ecoImpacts: {
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ecoPoints: user.ecoPoints,
      impacts: user.orders.flatMap((order) => order.ecoImpacts),
    };
  }

  async getEcoSummary(userId: string) {
    const [user, impacts, orders] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { ecoPoints: true },
      }),
      this.prisma.ecoImpact.findMany({
        where: { userId },
        select: { impact: true, pointsEarned: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.findMany({
        where: { buyerId: userId, paymentStatus: "SUCCEEDED" },
        select: { totalAmount: true, carbonOffset: true, ecoPointsAwarded: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!user) throw new NotFoundException("User not found");

    let totalCo2Kg = 0;
    let totalPlasticBottles = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const imp of impacts) {
      try {
        const data = typeof imp.impact === "string" ? JSON.parse(imp.impact) : (imp.impact as Record<string, unknown>);
        totalCo2Kg += Number(data.co2SavedKg) || 0;
        totalPlasticBottles += Number(data.plasticBottlesAvoided) || 0;
        const cat = String(data.category || "General");
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(data.co2SavedKg) || 0);
      } catch {
        // malformed JSON — skip
      }
    }

    const carbonOffsetOrders = orders.filter((o) => o.carbonOffset).length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Build monthly CO2 timeline (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyMap: Record<string, number> = {};
    for (const imp of impacts) {
      if (new Date(imp.createdAt) < sixMonthsAgo) continue;
      const month = new Date(imp.createdAt).toLocaleString("default", { month: "short", year: "2-digit" });
      try {
        const data = typeof imp.impact === "string" ? JSON.parse(imp.impact) : (imp.impact as Record<string, unknown>);
        monthlyMap[month] = (monthlyMap[month] || 0) + (Number(data.co2SavedKg) || 0);
      } catch { /* skip */ }
    }
    const monthlyTimeline = Object.entries(monthlyMap).map(([month, co2]) => ({ month, co2: Number(co2.toFixed(2)) }));

    return {
      ecoPoints: user.ecoPoints,
      totalCo2KgSaved: Number(totalCo2Kg.toFixed(2)),
      totalPlasticBottlesAvoided: totalPlasticBottles,
      carbonOffsetOrders,
      totalOrdersCompleted: orders.length,
      totalSpent: Number(totalSpent.toFixed(2)),
      categoryBreakdown,
      monthlyTimeline,
      treesEquivalent: Number((totalCo2Kg / 21).toFixed(2)),
    };
  }
}
