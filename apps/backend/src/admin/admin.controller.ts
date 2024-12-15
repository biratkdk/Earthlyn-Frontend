import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Request,
  Put,
  Param,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { ManageBalanceDto } from "./dto/manage-balance.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UserRole } from "../common/decorators/roles.decorator";
import type { AdminAuditQuery, AdminUserQuery } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("stats")
  async getStats() {
    return this.adminService.getStats();
  }

  @Get("users")
  async getUserList(@Query() query: AdminUserQuery) {
    return this.adminService.getUserList(query);
  }

  @Post("approve-seller")
  async approveSeller(@Request() req, @Body() body: { sellerId: string }) {
    return this.adminService.approveSeller(req.user.id, body.sellerId);
  }

  @Get("audit-logs")
  async getAuditLogs(@Query() query: AdminAuditQuery) {
    return this.adminService.getAuditLogs(query);
  }

  @Post("manage-balance")
  async manageBalance(
    @Request() req,
    @Body() manageBalanceDto: ManageBalanceDto,
  ) {
    return this.adminService.manageBalance(req.user.id, manageBalanceDto);
  }

  @Put("users/:userId/balance")
  async updateUserBalance(
    @Request() req,
    @Param("userId") userId: string,
    @Body() body: { type: "CREDIT" | "DEBIT"; amount: number; reason?: string },
  ) {
    const manageBalanceDto: ManageBalanceDto = {
      userId,
      type: body.type,
      amount: body.amount,
      reason: body.reason || `Manual balance adjustment: ${body.type}`,
    };
    return this.adminService.manageBalance(req.user.id, manageBalanceDto);
  }
}
