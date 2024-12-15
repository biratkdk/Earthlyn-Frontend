import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { DisputesService } from "./disputes.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { CreateDisputeDto } from "./dto/create-dispute.dto";
import { UpdateDisputeDto } from "./dto/update-dispute.dto";
import { RespondDisputeDto } from "./dto/respond-dispute.dto";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";

@Controller("disputes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Post()
  @Roles(UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.service.create(req.user.id, req.user.role, dto);
  }

  @Get("my")
  @Roles(UserRole.BUYER, UserRole.SELLER)
  async my(
    @Request() req: AuthenticatedRequest,
    @Query() query: PaginationQuery,
  ) {
    return this.service.myDisputes(req.user.id, query);
  }

  @Get(":id")
  @Roles(
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.ADMIN,
    UserRole.CUSTOMER_SERVICE,
  )
  async detail(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.service.getForUser(id, req.user.id, req.user.role);
  }

  @Post(":id/respond")
  @Roles(
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.ADMIN,
    UserRole.CUSTOMER_SERVICE,
  )
  async respond(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: RespondDisputeDto,
  ) {
    return this.service.respond(id, req.user.id, req.user.role, dto);
  }
}

@Controller("admin/disputes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CUSTOMER_SERVICE)
export class AdminDisputesController {
  constructor(private readonly service: DisputesService) {}

  @Get()
  async list(@Query("status") status?: string, @Query() query?: PaginationQuery) {
    return this.service.list(status, query);
  }

  @Patch(":id")
  async update(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateDisputeDto,
  ) {
    return this.service.update(id, req.user.id, dto);
  }
}
