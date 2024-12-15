import { Module } from "@nestjs/common";
import { DeliveryManagementService } from "./delivery-management.service";
import { DeliveryManagementController } from "./delivery-management.controller";
import { DatabaseModule } from "../database/database.module";
import { WebSocketModule } from "../websocket/websocket.module";

@Module({
  imports: [DatabaseModule, WebSocketModule],
  providers: [DeliveryManagementService],
  controllers: [DeliveryManagementController],
  exports: [DeliveryManagementService],
})
export class DeliveryManagementModule {}
