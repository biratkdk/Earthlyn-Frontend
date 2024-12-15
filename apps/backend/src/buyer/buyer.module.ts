import { Module } from "@nestjs/common";
import { BuyerService } from "./buyer.service";
import { BuyerController } from "./buyer.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [BuyerService],
  controllers: [BuyerController],
})
export class BuyerModule {}
