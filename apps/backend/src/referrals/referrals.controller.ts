import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ReferralsService } from "./referrals.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { CreateReferralDto } from "./dto/create-referral.dto";
import type { PaginationQuery } from "../common/pagination";

@Controller("referrals")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN)
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateReferralDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get("my")
  async mine(@Request() req, @Query() query: PaginationQuery) {
    return this.service.mine(req.user.id, query);
  }
}
