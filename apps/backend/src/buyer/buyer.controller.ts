import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  Query,
} from "@nestjs/common";
import { BuyerService } from "./buyer.service";
import { CreateBuyerDto } from "./dto/create-buyer.dto";
import { UpdateBuyerDto } from "./dto/update-buyer.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";

@Controller("buyers")
export class BuyerController {
  constructor(private buyerService: BuyerService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createBuyerDto: CreateBuyerDto,
  ) {
    return this.buyerService.create({ ...createBuyerDto, userId: req.user.id });
  }

  @Get()
  async findAll(@Query() query: PaginationQuery) {
    return this.buyerService.findAll(query);
  }

  @Get("balance/current")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async getBalance(@Req() req: AuthenticatedRequest) {
    const balance = await this.buyerService.getBalance(req.user.id);
    return { balance };
  }

  @Post("deposit")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async depositFunds(
    @Req() req: AuthenticatedRequest,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.buyerService.depositFunds(
      req.user.id,
      body.amount,
      body.description,
    );
  }

  @Post("withdraw")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async withdrawFunds(
    @Req() req: AuthenticatedRequest,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.buyerService.withdrawFunds(
      req.user.id,
      body.amount,
      body.description,
    );
  }

  @Get("transactions")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async getTransactionHistory(
    @Req() req: AuthenticatedRequest,
    @Query() query: PaginationQuery,
  ) {
    return this.buyerService.getTransactionHistory(req.user.id, query);
  }

  @Get("me/rewards")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async getRewards(@Req() req: AuthenticatedRequest) {
    return this.buyerService.getRewards(req.user.id);
  }

  @Get("me/eco-summary")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async getEcoSummary(@Req() req: AuthenticatedRequest) {
    return this.buyerService.getEcoSummary(req.user.id);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.buyerService.findOne(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() updateBuyerDto: UpdateBuyerDto,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      const buyer = await this.buyerService.findOne(id);
      if (!buyer || buyer.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized");
      }
    }
    return this.buyerService.update(id, updateBuyerDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    if (req.user.role !== UserRole.ADMIN) {
      const buyer = await this.buyerService.findOne(id);
      if (!buyer || buyer.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized");
      }
    }
    return this.buyerService.remove(id);
  }
}
