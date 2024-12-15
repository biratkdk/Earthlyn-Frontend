import { Module } from "@nestjs/common";
import { DisputesService } from "./disputes.service";
import {
  DisputesController,
  AdminDisputesController,
} from "./disputes.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [DisputesService],
  controllers: [DisputesController, AdminDisputesController],
})
export class DisputesModule {}
