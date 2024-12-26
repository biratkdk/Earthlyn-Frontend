import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { Prisma, UserRole } from "@prisma/client";
import { EmailService } from "../common/services/email.service";
import { createHash, randomBytes } from "node:crypto";

interface PasswordResetTokenPayload {
  sub: string;
  purpose: "password_reset";
}

interface EmailVerificationTokenPayload {
  rawToken: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly VALID_ROLES = [
    "ADMIN",
    "SELLER",
    "BUYER",
    "CUSTOMER_SERVICE",
  ];

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException("User already exists");

    // Validate and normalize role
    const normalizedRole = registerDto.role?.toUpperCase().trim();
    if (!normalizedRole || !this.VALID_ROLES.includes(normalizedRole)) {
      throw new BadRequestException(
        "Invalid role. Must be one of: ADMIN, SELLER, BUYER, CUSTOMER_SERVICE",
      );
    }
    if (
      (normalizedRole === "ADMIN" || normalizedRole === "CUSTOMER_SERVICE") &&
      this.configService.get<string>("ALLOW_ADMIN_REGISTRATION", "false") !==
        "true"
    ) {
      throw new BadRequestException("Role not allowed for public registration");
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.configService.get<number>("bcrypt.rounds") || 10,
    );

    const { user, verification } = await this.prismaService.$transaction(
      async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            name: registerDto.name,
            passwordHash: hashedPassword,
            role: normalizedRole as UserRole,
          },
        });

        if (normalizedRole === "SELLER") {
          await tx.seller.create({
            data: { userId: createdUser.id },
          });
        }

        if (normalizedRole === "BUYER") {
          await tx.buyer.create({
            data: { userId: createdUser.id },
          });
        }

        const createdVerification =
          await this.createEmailVerificationToken(tx, createdUser.id);

        return { user: createdUser, verification: createdVerification };
      },
    );

    await this.emailService.sendEmailVerification(
      user.email,
      this.buildEmailVerificationUrl(verification.rawToken),
    );

    const requiresEmailVerification = this.requiresEmailVerification();
    const accessToken = requiresEmailVerification
      ? undefined
      : this.jwtService.sign({
          sub: user.id,
          email: user.email,
          role: user.role,
        });

    return {
      accessToken,
      requiresEmailVerification,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (
      !user ||
      !(await bcrypt.compare(loginDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (!user.isActive) {
      throw new UnauthorizedException("Account is inactive");
    }
    if (this.requiresEmailVerification() && !user.emailVerifiedAt) {
      throw new UnauthorizedException("Email verification required");
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };
  }

  async resendEmailVerification(email: string): Promise<{ success: true }> {
    const user = await this.prismaService.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || !user.isActive || user.emailVerifiedAt) {
      return { success: true };
    }

    const verification = await this.prismaService.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      return this.createEmailVerificationToken(tx, user.id);
    });

    await this.emailService.sendEmailVerification(
      user.email,
      this.buildEmailVerificationUrl(verification.rawToken),
    );

    return { success: true };
  }

  async verifyEmail(token: string): Promise<{ success: true }> {
    const tokenHash = this.hashToken(token);
    const verification =
      await this.prismaService.emailVerificationToken.findUnique({
        where: { tokenHash },
      });

    if (
      !verification ||
      verification.consumedAt ||
      verification.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        "Invalid or expired email verification token",
      );
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() },
      });

      await tx.user.update({
        where: { id: verification.userId },
        data: { emailVerifiedAt: new Date() },
      });
    });

    return { success: true };
  }

  async requestPasswordReset(email: string): Promise<{ success: true }> {
    const user = await this.prismaService.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user || !user.isActive) {
      return { success: true };
    }

    const token = await this.jwtService.signAsync(
      { sub: user.id, purpose: "password_reset" },
      {
        secret: this.getPasswordResetSecret(user.passwordHash),
        expiresIn: "1h",
      },
    );
    const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    await this.emailService.sendPasswordReset(user.email, resetUrl);

    return { success: true };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ success: true }> {
    this.assertValidPassword(password);

    const decoded = this.jwtService.decode<PasswordResetTokenPayload>(token);
    if (!decoded?.sub || decoded.purpose !== "password_reset") {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    try {
      await this.jwtService.verifyAsync<PasswordResetTokenPayload>(token, {
        secret: this.getPasswordResetSecret(user.passwordHash),
      });
    } catch {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const hashedPassword = await bcrypt.hash(
      password,
      this.configService.get<number>("bcrypt.rounds") || 10,
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return { success: true };
  }

  async validateUser(userId: string): Promise<AuthResponseDto["user"]> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Unauthorized");
    }
    if (this.requiresEmailVerification() && !user.emailVerifiedAt) {
      throw new UnauthorizedException("Email verification required");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  private async createEmailVerificationToken(
    db: Prisma.TransactionClient,
    userId: string,
  ): Promise<EmailVerificationTokenPayload> {
    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      },
    });

    return { rawToken, expiresAt };
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private buildEmailVerificationUrl(token: string) {
    return `${this.getFrontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  }

  private assertValidPassword(password: string) {
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      throw new BadRequestException(
        "Password must be at least 8 characters and include a letter and number",
      );
    }
  }

  private getPasswordResetSecret(passwordHash: string) {
    return `${this.configService.get<string>("jwt.secret")}:${passwordHash}`;
  }

  private requiresEmailVerification() {
    return (
      this.configService.get<string>("REQUIRE_EMAIL_VERIFICATION", "false") ===
      "true"
    );
  }

  private getFrontendUrl() {
    const configuredUrl = this.configService.get<string>("FRONTEND_URL");
    if (configuredUrl) return configuredUrl.replace(/\/$/, "");

    const corsOrigin = this.configService.get<string>("CORS_ORIGIN");
    if (corsOrigin && corsOrigin !== "*" && !corsOrigin.includes(",")) {
      return corsOrigin.replace(/\/$/, "");
    }

    return "http://localhost:3000";
  }
}
// password reset flow
