import { Module } from "@nestjs/common";
import { CustomerServiceService } from "./customer-service.service";
import { CustomerServiceController } from "./customer-service.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [CustomerServiceService],
  controllers: [CustomerServiceController],
  exports: [CustomerServiceService],
})
export class CustomerServiceModule {}
