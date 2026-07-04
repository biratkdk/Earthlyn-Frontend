import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  BadRequestException,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import type { AuthResponseDto } from "./dto/auth-response.dto";
import {
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  XSRF_TOKEN_COOKIE,
  createXsrfToken,
} from "./auth-cookie";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!registerDto.email || !registerDto.password || !registerDto.role) {
      throw new BadRequestException("Missing required fields");
    }
    const auth = await this.authService.register(registerDto);
    this.setAuthCookies(response, auth);
    return this.toPublicAuthResponse(auth);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException("Email and password required");
    }
    const auth = await this.authService.login(loginDto);
    this.setAuthCookies(response, auth);
    return this.toPublicAuthResponse(auth);
  }

  @Get("csrf")
  csrf(@Res({ passthrough: true }) response: Response) {
    const token = createXsrfToken();
    response.cookie(XSRF_TOKEN_COOKIE, token, this.getCsrfCookieOptions());
    // Return token in body so cross-origin frontends can read it
    // (document.cookie is inaccessible for cross-origin cookies)
    return { csrfToken: token };
  }

  @Post("forgot-password")
  async forgotPassword(@Body("email") email?: string) {
    if (!email) {
      throw new BadRequestException("Email is required");
    }

    return this.authService.requestPasswordReset(email);
  }

  @Post("verify-email")
  async verifyEmail(@Body("token") token?: string) {
    if (!token) {
      throw new BadRequestException("Token is required");
    }

    return this.authService.verifyEmail(token);
  }

  @Post("resend-verification")
  async resendVerification(@Body("email") email?: string) {
    if (!email) {
      throw new BadRequestException("Email is required");
    }

    return this.authService.resendEmailVerification(email);
  }

  @Post("reset-password")
  async resetPassword(
    @Body("token") token?: string,
    @Body("password") password?: string,
  ) {
    if (!token || !password) {
      throw new BadRequestException("Token and password are required");
    }

    return this.authService.resetPassword(token, password);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    this.clearAuthCookies(response);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("validate")
  async validate(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.setCsrfCookie(response);
    return this.authService.validateUser(user.id);
  }

  private setAuthCookies(response: Response, auth: AuthResponseDto) {
    if (!auth.accessToken || auth.requiresEmailVerification) {
      return;
    }

    const options = this.getCookieOptions();
    response.cookie(AUTH_SESSION_COOKIE, auth.accessToken, options);
    response.cookie(AUTH_ROLE_COOKIE, auth.user.role, options);
    this.setCsrfCookie(response);
  }

  private toPublicAuthResponse(auth: AuthResponseDto) {
    return {
      requiresEmailVerification: auth.requiresEmailVerification,
      user: auth.user,
    };
  }

  private clearAuthCookies(response: Response) {
    const options = this.getCookieOptions();
    response.clearCookie(AUTH_SESSION_COOKIE, options);
    response.clearCookie(AUTH_ROLE_COOKIE, options);
    response.clearCookie(XSRF_TOKEN_COOKIE, this.getCsrfCookieOptions());
  }

  private setCsrfCookie(response: Response) {
    response.cookie(
      XSRF_TOKEN_COOKIE,
      createXsrfToken(),
      this.getCsrfCookieOptions(),
    );
  }

  private getBaseCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>("NODE_ENV", "development") === "production";
    const domain = this.configService.get<string>("AUTH_COOKIE_DOMAIN");

    return {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      ...(domain ? { domain } : {}),
    };
  }

  private getCookieOptions(): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      httpOnly: true,
    };
  }

  private getCsrfCookieOptions(): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      httpOnly: false,
    };
  }
}
