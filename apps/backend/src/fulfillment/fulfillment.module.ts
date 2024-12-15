import { Module } from "@nestjs/common";
import { FulfillmentService } from "./fulfillment.service";
import { FulfillmentController } from "./fulfillment.controller";
import { DatabaseModule } from "../database/database.module";
import { DeliveryManagementModule } from "../delivery-management/delivery-management.module";

@Module({
  imports: [DatabaseModule, DeliveryManagementModule],
  providers: [FulfillmentService],
  controllers: [FulfillmentController],
})
export class FulfillmentModule {}
