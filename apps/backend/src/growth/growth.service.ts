import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole, type SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import {
  DEFAULT_SUBSCRIPTION_PLANS,
  normalizePlanBenefits,
  toMonthlyPrice,
  type SubscriptionPlanView,
} from "../subscriptions/subscription-plans";
import {
  type MarketingAudience,
  type CreateMarketingCampaignDto,
} from "./dto/create-marketing-campaign.dto";
import { type UpdateReferralStatusDto } from "./dto/update-referral-status.dto";
import { CreateSubscriptionPlanDto } from "./dto/create-subscription-plan.dto";
import { UpdateSubscriptionPlanDto } from "./dto/update-subscription-plan.dto";

export type GrowthCampaignQuery = PaginationQuery & {
  audience?: string;
  status?: string;
  search?: string;
};

export type GrowthReferralQuery = PaginationQuery & {
  status?: string;
  search?: string;
};

const DEFAULT_REFERRAL_REWARD_POINTS = 250;

@Injectable()
export class GrowthService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
      subscriptionGroups,
      plans,
      totalCampaigns,
      sentCampaigns,
      draftCampaigns,
      recentCampaigns,
      buyers,
      sellers,
      marketingReach,
      approvedProducts,
      inStockProducts,
      topCategories,
    ] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: "PENDING" } }),
      this.prisma.referral.count({ where: { status: "COMPLETED" } }),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: "ACTIVE" } }),
      this.prisma.subscription.count({ where: { status: "CANCELLED" } }),
      this.prisma.subscription.count({ where: { status: "EXPIRED" } }),
      this.prisma.subscription.groupBy({
        by: ["plan", "status"],
        _count: { _all: true },
      }),
      this.prisma.subscriptionPlan.findMany(),
      this.prisma.marketingCampaign.count(),
      this.prisma.marketingCampaign.count({ where: { status: "SENT" } }),
      this.prisma.marketingCampaign.count({ where: { status: "DRAFT" } }),
      this.prisma.marketingCampaign.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.user.count({ where: { role: UserRole.BUYER } }),
      this.prisma.user.count({ where: { role: UserRole.SELLER } }),
      this.prisma.user.count({ where: this.getAudienceWhere("ALL") }),
      this.prisma.product.count({ where: { approvalStatus: "APPROVED" } }),
      this.prisma.product.count({
        where: { approvalStatus: "APPROVED", stock: { gt: 0 } },
      }),
      this.prisma.product.groupBy({
        by: ["category"],
        where: { approvalStatus: "APPROVED" },
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
        take: 5,
      }),
    ]);

    const planViews = this.toPlanViews(plans);
    const planPrices = new Map(planViews.map((plan) => [plan.code, plan]));
    const planBreakdown = subscriptionGroups.map((group) => {
      const plan = planPrices.get(group.plan);
      return {
        plan: group.plan,
        status: group.status,
        count: group._count._all,
        monthlyRevenue:
          group.status === "ACTIVE" && plan
            ? toMonthlyPrice(plan.price, plan.interval) * group._count._all
            : 0,
      };
    });
    const monthlyRecurringRevenue = planBreakdown.reduce(
      (sum, row) => sum + row.monthlyRevenue,
      0,
    );

    return {
      referrals: {
        total: totalReferrals,
        pending: pendingReferrals,
        completed: completedReferrals,
        conversionRate: this.getRate(completedReferrals, totalReferrals),
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        cancelled: cancelledSubscriptions,
        expired: expiredSubscriptions,
        monthlyRecurringRevenue,
        planBreakdown,
      },
      campaigns: {
        total: totalCampaigns,
        sent: sentCampaigns,
        draft: draftCampaigns,
        recent: recentCampaigns,
      },
      audience: {
        buyers,
        sellers,
        marketingReach,
      },
      recommendations: {
        approvedProducts,
        inStockProducts,
        topCategories: topCategories.map((row) => ({
          category: row.category,
          count: row._count.category,
        })),
      },
    };
  }

  async listCampaigns(query: GrowthCampaignQuery = {}) {
    const pagination = getPaginationParams({ pageSize: 10, ...query });
    const where: Prisma.MarketingCampaignWhereInput = {};
    const search = query.search?.trim();
    const audience = query.audience?.trim().toUpperCase();
    const status = query.status?.trim().toUpperCase();

    if (audience && audience !== "ALL") {
      where.audience = audience;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.marketingCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.marketingCampaign.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async createCampaign(adminId: string, dto: CreateMarketingCampaignDto) {
    const sendNow = dto.sendNow ?? true;
    const audience = dto.audience;

    return this.prisma.$transaction(async (tx) => {
      const recipients = sendNow
        ? await tx.user.findMany({
            where: this.getAudienceWhere(audience),
            select: { id: true },
          })
        : [];

      const campaign = await tx.marketingCampaign.create({
        data: {
          createdById: adminId,
          title: dto.title.trim(),
          message: dto.message.trim(),
          audience,
          status: sendNow ? "SENT" : "DRAFT",
          recipientCount: recipients.length,
          sentAt: sendNow ? new Date() : null,
        },
      });

      if (sendNow && recipients.length > 0) {
        await tx.notification.createMany({
          data: recipients.map((recipient) => ({
            userId: recipient.id,
            type: "PROMOTION",
            message: campaign.message,
            metadata: {
              campaignId: campaign.id,
              title: campaign.title,
              audience,
            },
          })),
        });
      }

      await this.createAdminAudit(tx, adminId, {
        action: sendNow ? "SEND_MARKETING_CAMPAIGN" : "CREATE_MARKETING_DRAFT",
        entityType: "MARKETING_CAMPAIGN",
        entityId: campaign.id,
        metadata: {
          audience,
          recipientCount: recipients.length,
          title: campaign.title,
        },
      });

      return campaign;
    });
  }

  async sendCampaign(adminId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.marketingCampaign.findUnique({ where: { id } });

      if (!existing) {
        throw new NotFoundException("Campaign not found");
      }

      if (existing.status === "SENT") {
        throw new ConflictException("Campaign has already been sent");
      }

      const recipients = await tx.user.findMany({
        where: this.getAudienceWhere(existing.audience as MarketingAudience),
        select: { id: true },
      });

      const campaign = await tx.marketingCampaign.update({
        where: { id },
        data: {
          status: "SENT",
          recipientCount: recipients.length,
          sentAt: new Date(),
        },
      });

      if (recipients.length > 0) {
        await tx.notification.createMany({
          data: recipients.map((recipient) => ({
            userId: recipient.id,
            type: "PROMOTION",
            message: campaign.message,
            metadata: {
              campaignId: campaign.id,
              title: campaign.title,
              audience: campaign.audience,
            },
          })),
        });
      }

      await this.createAdminAudit(tx, adminId, {
        action: "SEND_MARKETING_CAMPAIGN",
        entityType: "MARKETING_CAMPAIGN",
        entityId: campaign.id,
        metadata: {
          audience: campaign.audience,
          recipientCount: recipients.length,
          title: campaign.title,
        },
      });

      return campaign;
    });
  }

  async listReferrals(query: GrowthReferralQuery = {}) {
    const pagination = getPaginationParams({ pageSize: 10, ...query });
    const where: Prisma.ReferralWhereInput = {};
    const status = query.status?.trim().toUpperCase();
    const search = query.search?.trim();

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { referrer: { email: { contains: search, mode: "insensitive" } } },
        { referrer: { name: { contains: search, mode: "insensitive" } } },
        { referee: { email: { contains: search, mode: "insensitive" } } },
        { referee: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        include: {
          referrer: { select: { id: true, name: true, email: true } },
          referee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async updateReferralStatus(
    adminId: string,
    id: string,
    dto: UpdateReferralStatusDto,
  ) {
    const rewardPoints =
      dto.rewardPoints === undefined
        ? DEFAULT_REFERRAL_REWARD_POINTS
        : dto.rewardPoints;

    return this.prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUnique({
        where: { id },
        include: {
          referrer: { select: { id: true, name: true, email: true } },
          referee: { select: { id: true, name: true, email: true } },
        },
      });

      if (!referral) {
        throw new NotFoundException("Referral not found");
      }

      const previousStatus = referral.status;
      const updated = await tx.referral.update({
        where: { id },
        data: { status: dto.status },
        include: {
          referrer: { select: { id: true, name: true, email: true } },
          referee: { select: { id: true, name: true, email: true } },
        },
      });

      const shouldReward =
        previousStatus !== "COMPLETED" &&
        dto.status === "COMPLETED" &&
        rewardPoints > 0;

      if (shouldReward) {
        await tx.user.update({
          where: { id: referral.referrerId },
          data: { ecoPoints: { increment: rewardPoints } },
        });

        await tx.notification.create({
          data: {
            userId: referral.referrerId,
            type: "REFERRAL_REWARD",
            message: `Referral completed. ${rewardPoints} eco points added.`,
            metadata: {
              referralId: referral.id,
              refereeId: referral.refereeId,
              rewardPoints,
            },
          },
        });
      }

      await this.createAdminAudit(tx, adminId, {
        action: "UPDATE_REFERRAL_STATUS",
        entityType: "REFERRAL",
        entityId: referral.id,
        metadata: {
          previousStatus,
          nextStatus: dto.status,
          rewardPoints: shouldReward ? rewardPoints : 0,
        },
      });

      return updated;
    });
  }

  async listSubscriptionPlans(query: PaginationQuery = {}) {
    const pagination = getPaginationParams({ pageSize: 20, ...query });
    const [items, totalItems] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.subscriptionPlan.count(),
    ]);

    return buildPaginatedResponse(
      this.toPlanViews(items),
      totalItems,
      pagination,
    );
  }

  async createSubscriptionPlan(
    adminId: string,
    dto: CreateSubscriptionPlanDto,
  ) {
    const code = this.normalizePlanCode(dto.code);

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.create({
        data: {
          code,
          name: dto.name.trim(),
          description: dto.description.trim(),
          price: dto.price,
          interval: dto.interval,
          benefits: dto.benefits,
          stripePriceId: dto.stripePriceId || null,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 100,
        },
      });

      await this.createAdminAudit(tx, adminId, {
        action: "CREATE_SUBSCRIPTION_PLAN",
        entityType: "SUBSCRIPTION_PLAN",
        entityId: plan.id,
        metadata: { code: plan.code, price: Number(plan.price) },
      });

      return this.toPlanView(plan);
    });
  }

  async updateSubscriptionPlan(
    adminId: string,
    id: string,
    dto: UpdateSubscriptionPlanDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.subscriptionPlan.findUnique({ where: { id } });

      if (!existing) {
        throw new NotFoundException("Subscription plan not found");
      }

      const plan = await tx.subscriptionPlan.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.interval !== undefined ? { interval: dto.interval } : {}),
          ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
          ...(dto.stripePriceId !== undefined
            ? { stripePriceId: dto.stripePriceId || null }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });

      await this.createAdminAudit(tx, adminId, {
        action: "UPDATE_SUBSCRIPTION_PLAN",
        entityType: "SUBSCRIPTION_PLAN",
        entityId: plan.id,
        metadata: {
          code: plan.code,
          previousPrice: Number(existing.price),
          nextPrice: Number(plan.price),
          isActive: plan.isActive,
        },
      });

      return this.toPlanView(plan);
    });
  }

  private getAudienceWhere(audience: MarketingAudience): Prisma.UserWhereInput {
    const roleFilter =
      audience === "BUYERS"
        ? { role: UserRole.BUYER }
        : audience === "SELLERS"
          ? { role: UserRole.SELLER }
          : {};

    return {
      isActive: true,
      ...roleFilter,
      OR: [
        { privacySettings: { is: null } },
        { privacySettings: { is: { marketing: true } } },
      ],
    };
  }

  private toPlanViews(plans: SubscriptionPlan[]) {
    if (plans.length === 0) {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }

    return plans.map((plan) => this.toPlanView(plan));
  }

  private toPlanView(plan: SubscriptionPlan): SubscriptionPlanView {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      interval: plan.interval,
      benefits: normalizePlanBenefits(plan.benefits),
      stripePriceId: plan.stripePriceId,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    };
  }

  private normalizePlanCode(code: string) {
    const normalized = code.trim().toUpperCase().replace(/\s+/g, "_");

    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      throw new BadRequestException(
        "Plan code may only contain letters, numbers, and underscores",
      );
    }

    return normalized;
  }

  private getRate(numerator: number, denominator: number) {
    if (denominator === 0) {
      return 0;
    }

    return Math.round((numerator / denominator) * 10000) / 100;
  }

  private async createAdminAudit(
    tx: Prisma.TransactionClient,
    adminId: string,
    data: {
      action: string;
      entityType: string;
      entityId?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await tx.adminAudit.create({
      data: {
        adminId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata,
      },
    });
  }
}

