import { Module } from "@nestjs/common";
import { EcoVerifyController } from "./eco-verify.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [EcoVerifyController],
})
export class EcoVerifyModule {}
