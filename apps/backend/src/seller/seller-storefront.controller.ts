import { Controller, Get, Param } from "@nestjs/common";
import { SellerService } from "./seller.service";

@Controller("sellers/public")
export class SellerStorefrontController {
  constructor(private sellerService: SellerService) {}

  @Get(":id")
  getPublicStorefront(@Param("id") id: string) {
    return this.sellerService.getPublicStorefront(id);
  }
}
