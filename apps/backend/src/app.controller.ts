import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  checks?: Record<string, string>;
}

@Controller()
export class AppController {
  private startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  root(): HealthResponse {
    return {
      status: "EARTHLYN Backend Running",
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  @Get("health")
  @HttpCode(HttpStatus.OK)
  async health(): Promise<HealthResponse> {
    return this.ready();
  }

  @Get("health/live")
  @HttpCode(HttpStatus.OK)
  live(): HealthResponse {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  @Get("health/ready")
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: { database: "up" },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "ERROR",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: { database: "down" },
      });
    }
  }
}
