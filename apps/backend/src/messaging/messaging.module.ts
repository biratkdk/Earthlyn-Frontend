import { Module } from "@nestjs/common";
import { MessagingService } from "./messaging.service";
import { MessagingController } from "./messaging.controller";
import { DatabaseModule } from "../database/database.module";
import { WebSocketModule } from "../websocket/websocket.module";

@Module({
  imports: [DatabaseModule, WebSocketModule],
  providers: [MessagingService],
  controllers: [MessagingController],
})
export class MessagingModule {}
