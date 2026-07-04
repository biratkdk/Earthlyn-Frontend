import { Controller, Get, Post, Param, UseGuards, Req } from "@nestjs/common";
import { WishlistService } from "./wishlist.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";

@Controller("wishlist")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.ADMIN)
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  getWishlist(@Req() req: AuthenticatedRequest) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post(":productId")
  toggle(@Req() req: AuthenticatedRequest, @Param("productId") productId: string) {
    return this.wishlistService.toggle(req.user.id, productId);
  }

  @Get(":productId/status")
  status(@Req() req: AuthenticatedRequest, @Param("productId") productId: string) {
    return this.wishlistService.isWishlisted(req.user.id, productId);
  }
}
