import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { UserRole } from "../common/decorators/roles.decorator";
import { AUTH_SESSION_COOKIE, getCookieValue } from "./auth-cookie";
import { PrismaService } from "../database/prisma.service";

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    const secret = configService.get<string>("jwt.secret");

    super({
      jwtFromRequest: (request?: Request) =>
        request ? getCookieValue(request.headers.cookie, AUTH_SESSION_COOKIE) : null,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user?.isActive) {
      throw new UnauthorizedException("Unauthorized");
    }

    if (
      this.configService.get<string>("REQUIRE_EMAIL_VERIFICATION", "false") ===
        "true" &&
      !user.emailVerifiedAt
    ) {
      throw new UnauthorizedException("Email verification required");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
