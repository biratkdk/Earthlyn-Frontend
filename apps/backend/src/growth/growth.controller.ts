import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { GrowthService } from "./growth.service";
import { CreateMarketingCampaignDto } from "./dto/create-marketing-campaign.dto";
import { UpdateReferralStatusDto } from "./dto/update-referral-status.dto";
import { CreateSubscriptionPlanDto } from "./dto/create-subscription-plan.dto";
import { UpdateSubscriptionPlanDto } from "./dto/update-subscription-plan.dto";
import type { PaginationQuery } from "../common/pagination";
import type {
  GrowthCampaignQuery,
  GrowthReferralQuery,
} from "./growth.service";

@Controller("admin/growth")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get("summary")
  async summary() {
    return this.growthService.getSummary();
  }

  @Get("campaigns")
  async campaigns(@Query() query: GrowthCampaignQuery) {
    return this.growthService.listCampaigns(query);
  }

  @Post("campaigns")
  async createCampaign(
    @Request() req,
    @Body() dto: CreateMarketingCampaignDto,
  ) {
    return this.growthService.createCampaign(req.user.id, dto);
  }

  @Post("campaigns/:id/send")
  async sendCampaign(@Request() req, @Param("id") id: string) {
    return this.growthService.sendCampaign(req.user.id, id);
  }

  @Get("referrals")
  async referrals(@Query() query: GrowthReferralQuery) {
    return this.growthService.listReferrals(query);
  }

  @Patch("referrals/:id/status")
  async updateReferralStatus(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: UpdateReferralStatusDto,
  ) {
    return this.growthService.updateReferralStatus(req.user.id, id, dto);
  }

  @Get("subscription-plans")
  async subscriptionPlans(@Query() query: PaginationQuery) {
    return this.growthService.listSubscriptionPlans(query);
  }

  @Post("subscription-plans")
  async createSubscriptionPlan(
    @Request() req,
    @Body() dto: CreateSubscriptionPlanDto,
  ) {
    return this.growthService.createSubscriptionPlan(req.user.id, dto);
  }

  @Patch("subscription-plans/:id")
  async updateSubscriptionPlan(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.growthService.updateSubscriptionPlan(req.user.id, id, dto);
  }
}
