import { ConfigService } from "@nestjs/config";

export interface QueueBackendConfig {
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions: {
    attempts: number;
    timeout: number;
  };
}

export const getQueueBackendConfig = (
  configService: ConfigService,
): QueueBackendConfig => ({
  redis: {
    url: configService.get<string>("REDIS_URL") || undefined,
    host: configService.get<string>("REDIS_HOST", "localhost"),
    port: configService.get<number>("REDIS_PORT", 6379),
    password: configService.get<string>("REDIS_PASSWORD") || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    timeout: 30 * 60 * 1000,
  },
});
