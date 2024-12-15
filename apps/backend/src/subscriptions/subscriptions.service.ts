import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import {
  DEFAULT_SUBSCRIPTION_PLANS,
  normalizePlanBenefits,
  type SubscriptionPlanView,
} from "./subscription-plans";

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    });

    if (plans.length === 0) {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }

    return plans.map((plan): SubscriptionPlanView => {
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
    });
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    const planCode = dto.plan.trim().toUpperCase();
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException("Select an active subscription plan");
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (activeSubscription) {
      throw new ConflictException("You already have an active subscription");
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        plan: plan.code,
        status: "ACTIVE",
      },
    });
  }

  async cancel(userId: string, id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });

    if (!sub) {
      throw new NotFoundException("Subscription not found");
    }

    if (sub.userId !== userId) {
      throw new ForbiddenException(
        "Not authorized to cancel this subscription",
      );
    }

    if (sub.status !== "ACTIVE") {
      return sub;
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: "CANCELLED", endsAt: new Date() },
    });
  }

  async mine(userId: string, query: PaginationQuery = {}) {
    const pagination = getPaginationParams(query);
    const where = { userId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }
}
