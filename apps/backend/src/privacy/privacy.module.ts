import { Module } from "@nestjs/common";
import { PrivacyService } from "./privacy.service";
import { PrivacyController } from "./privacy.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [PrivacyService],
  controllers: [PrivacyController],
  exports: [PrivacyService],
})
export class PrivacyModule {}
