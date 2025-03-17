import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get("dashboard")
  async getDashboard(@Query("days") days?: string) {
    return this.service.getDashboardStats(parseOptionalDays(days));
  }

  @Get("top-sellers")
  async getTopSellers(
    @Query("limit") limit?: string,
    @Query("days") days?: string,
  ) {
    return this.service.getTopSellers(
      parseInt(limit || "10"),
      parseOptionalDays(days),
    );
  }

  @Get("revenue-trends")
  async getRevenueTrends(@Query("days") days?: string) {
    return this.service.getRevenueTrends(parseInt(days || "30"));
  }

  @Get("eco-impact")
  async getEcoImpact(@Query("days") days?: string) {
    return this.service.getEcoImpactStats(parseOptionalDays(days));
  }

  @Get("user-growth")
  async getUserGrowth(@Query("days") days?: string) {
    return this.service.getUserGrowth(parseInt(days || "30"));
  }

  @Get("products")
  async getProductStats(@Query("days") days?: string) {
    return this.service.getProductStats(parseOptionalDays(days));
  }

  @Get("referrals")
  async getReferralStats(@Query("days") days?: string) {
    return this.service.getReferralStats(parseOptionalDays(days));
  }

  @Get("subscriptions")
  async getSubscriptionStats(@Query("days") days?: string) {
    return this.service.getSubscriptionStats(parseOptionalDays(days));
  }

  @Get("retention")
  async getBuyerRetention(@Query("days") days?: string) {
    return this.service.getBuyerRetention(parseOptionalDays(days));
  }

  @Get("categories")
  async getTopCategories(
    @Query("limit") limit?: string,
    @Query("days") days?: string,
  ) {
    return this.service.getTopCategories(
      parseInt(limit || "10"),
      parseOptionalDays(days),
    );
  }
}

function parseOptionalDays(days?: string) {
  if (!days || days === "all") {
    return undefined;
  }

  const parsed = parseInt(days, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

