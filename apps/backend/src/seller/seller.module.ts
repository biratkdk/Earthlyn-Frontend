import { Module } from "@nestjs/common";
import { SellerService } from "./seller.service";
import { SellerController } from "./seller.controller";
import { SellerStorefrontController } from "./seller-storefront.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [SellerService],
  controllers: [SellerController, SellerStorefrontController],
})
export class SellerModule {}
