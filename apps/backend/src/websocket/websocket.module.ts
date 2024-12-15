import { Module } from "@nestjs/common";
import { NotificationGateway } from "./websocket.gateway";
import { WebSocketService } from "./websocket.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [NotificationGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
