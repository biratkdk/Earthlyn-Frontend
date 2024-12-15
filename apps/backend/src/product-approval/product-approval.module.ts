import { Module } from "@nestjs/common";
import { ProductApprovalService } from "./product-approval.service";
import { ProductApprovalController } from "./product-approval.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [ProductApprovalService],
  controllers: [ProductApprovalController],
})
export class ProductApprovalModule {}
