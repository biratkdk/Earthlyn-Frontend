import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  Query,
} from "@nestjs/common";
import { SellerService } from "./seller.service";
import { CreateSellerDto } from "./dto/create-seller.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { UpdateSellerDto } from "./dto/update-seller.dto";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";

@Controller("sellers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SellerController {
  constructor(private sellerService: SellerService) {}

  @Post()
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  create(@Req() req: AuthenticatedRequest, @Body() createSellerDto: CreateSellerDto) {
    return this.sellerService.create({
      ...createSellerDto,
      userId: req.user.id,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: PaginationQuery) {
    return this.sellerService.findAll(query);
  }

  @Get("by-user/:userId")
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async findByUserId(@Param("userId") userId: string) {
    return this.sellerService.findByUserId(userId);
  }

  @Get(":id/earnings")
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async getEarnings(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query() query?: PaginationQuery,
  ) {
    // Verify seller ownership or admin
    if (req.user.role !== UserRole.ADMIN) {
      const seller = await this.sellerService.findOne(id);
      if (!seller || seller.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized to view earnings");
      }
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.sellerService.getEarningsSummary(
      id,
      startDateObj,
      endDateObj,
      query,
    );
  }

  @Get(":id/profit-summary")
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async getProfitSummary(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Verify seller ownership or admin
    if (req.user.role !== UserRole.ADMIN) {
      const seller = await this.sellerService.findOne(id);
      if (!seller || seller.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized to view profit summary");
      }
    }

    return this.sellerService.getProfitSummary(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.sellerService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() data: UpdateSellerDto,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      if (data.tier) {
        throw new ForbiddenException("Only admins can update seller tiers");
      }

      const seller = await this.sellerService.findOne(id);
      if (!seller || seller.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized");
      }
    }
    return this.sellerService.update(id, data);
  }

  @Delete(":id")
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    if (req.user.role !== UserRole.ADMIN) {
      const seller = await this.sellerService.findOne(id);
      if (!seller || seller.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized");
      }
    }
    return this.sellerService.remove(id);
  }
}
