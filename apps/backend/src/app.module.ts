import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "./database/database.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { SellerModule } from "./seller/seller.module";
import { BuyerModule } from "./buyer/buyer.module";
import { AdminModule } from "./admin/admin.module";
import { MessagingModule } from "./messaging/messaging.module";
import { OrderModule } from "./order/order.module";
import { PaymentModule } from "./payment/payment.module";
import { ProductModule } from "./product/product.module";
import { ProductApprovalModule } from "./product-approval/product-approval.module";
import { SellerKycModule } from "./seller-kyc/seller-kyc.module";
import { DeliveryManagementModule } from "./delivery-management/delivery-management.module";
import { MessageModerationModule } from "./message-moderation/message-moderation.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { CustomerServiceModule } from "./customer-service/customer-service.module";
import { WebSocketModule } from "./websocket/websocket.module";
import configuration from "./config/configuration";
import { validateEnv } from "./config/env-validation";
import { DisputesModule } from "./disputes/disputes.module";
import { ReferralsModule } from "./referrals/referrals.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { FulfillmentModule } from "./fulfillment/fulfillment.module";
import { GrowthModule } from "./growth/growth.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { EcoVerifyModule } from "./eco-verify/eco-verify.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ".env",
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get("THROTTLE_TTL") || 60),
            limit: Number(configService.get("THROTTLE_LIMIT") || 10),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: {
          expiresIn: configService.get<string>(
            "jwt.expiresIn",
            "7d",
          ) as JwtSignOptions["expiresIn"],
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    SellerModule,
    BuyerModule,
    AdminModule,
    MessagingModule,
    OrderModule,
    PaymentModule,
    ProductModule,
    ProductApprovalModule,
    SellerKycModule,
    DeliveryManagementModule,
    MessageModerationModule,
    AnalyticsModule,
    PrivacyModule,
    CustomerServiceModule,
    WebSocketModule,
    DisputesModule,
    ReferralsModule,
    SubscriptionsModule,
    FulfillmentModule,
    GrowthModule,
    NotificationsModule,
    WishlistModule,
    EcoVerifyModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

