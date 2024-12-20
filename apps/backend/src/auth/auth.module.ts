import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { DatabaseModule } from "../database/database.module";
import { EmailService } from "../common/services/email.service";

@Module({
  imports: [PassportModule, DatabaseModule],
  providers: [AuthService, JwtStrategy, EmailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
// JWT auth bootstrap
