import {
  Controller,
  Body,
  Get,
  Post,
  Param,
  UseGuards,
  Query,
  Request,
} from "@nestjs/common";
import { ProductApprovalService } from "./product-approval.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import type { PaginationQuery } from "../common/pagination";

@Controller("admin/product-approval")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ProductApprovalController {
  constructor(private readonly service: ProductApprovalService) {}

  @Get("pending")
  async getPending(@Query() query: PaginationQuery) {
    return this.service.getPendingProducts(query);
  }

  @Get("approved")
  async getApproved(@Query() query: PaginationQuery) {
    return this.service.getApprovedProducts(query);
  }

  @Get("rejected")
  async getRejected(@Query() query: PaginationQuery) {
    return this.service.getRejectedProducts(query);
  }

  @Get("stats")
  async getStats() {
    return this.service.getProductStats();
  }

  @Post(":productId/approve")
  async approve(@Request() req, @Param("productId") productId: string) {
    return this.service.approveProduct(req.user.id, productId);
  }

  @Post(":productId/reject")
  async reject(
    @Request() req,
    @Param("productId") productId: string,
    @Body("reason") reason?: string,
  ) {
    return this.service.rejectProduct(req.user.id, productId, reason);
  }
}
