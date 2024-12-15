import { Module } from "@nestjs/common";
import { SellerKycService } from "./seller-kyc.service";
import {
  SellerKycController,
  KycAdminController,
} from "./seller-kyc.controller";
import { DatabaseModule } from "../database/database.module";
import { FileUploadService } from "../common/services/file-upload.service";

@Module({
  imports: [DatabaseModule],
  providers: [SellerKycService, FileUploadService],
  controllers: [SellerKycController, KycAdminController],
})
export class SellerKycModule {}
