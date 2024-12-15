import { Module } from "@nestjs/common";
import { MessageModerationService } from "./message-moderation.service";
import { MessageModerationController } from "./message-moderation.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [MessageModerationService],
  controllers: [MessageModerationController],
})
export class MessageModerationModule {}
