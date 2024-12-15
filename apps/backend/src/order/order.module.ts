import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { DatabaseModule } from "../database/database.module";
import { PaymentModule } from "../payment/payment.module";
import { QueueService } from "../common/services/queue.service";
import { EmailService } from "../common/services/email.service";
import { WebSocketModule } from "../websocket/websocket.module";

@Module({
  imports: [DatabaseModule, PaymentModule, WebSocketModule],
  controllers: [OrderController],
  providers: [OrderService, QueueService, EmailService],
})
export class OrderModule {}
