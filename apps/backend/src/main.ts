import { NestFactory } from "@nestjs/core";
import { Logger, LogLevel, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { json } from "express";
import type { Request, Response } from "express";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { csrfProtection } from "./common/middleware/csrf-protection";

type RawBodyRequest = Request & { rawBody?: Buffer };

function formatFatalError(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

function writeFatalError(context: string, error: unknown) {
  process.stderr.write(`${context}\n${formatFatalError(error)}\n`);
}

function buildCorsOptions(corsOrigin: string, isProduction: boolean) {
  const normalized = corsOrigin.trim();
  const allowAll = normalized === "*";

  if (allowAll && isProduction) {
    throw new Error("CORS_ORIGIN must not be '*' in production");
  }

  const allowedOrigins = allowAll
    ? []
    : normalized
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

  return {
    origin: allowAll
      ? true
      : (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin) {
            return callback(null, true);
          }

          const isAllowed = allowedOrigins.includes(origin);
          return callback(
            isAllowed ? null : new Error("Not allowed by CORS"),
            isAllowed,
          );
        },
    credentials: !allowAll,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Stripe-Signature",
      "X-XSRF-TOKEN",
    ],
  };
}

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>("NODE_ENV", "development");
  const isProduction = nodeEnv === "production";

  const logLevels: LogLevel[] = isProduction
    ? ["log", "error", "warn"]
    : ["log", "error", "warn", "debug"];
  app.useLogger(logLevels);
  app.enableShutdownHooks();
  app.use(helmet());
  app.useStaticAssets(join(process.cwd(), "public"), { prefix: "/" });
  app.use(
    json({
      limit: "1mb",
      verify: (req: RawBodyRequest, _res: Response, buf: Buffer) => {
        if (req.originalUrl === "/payments/webhook") {
          req.rawBody = buf;
        }
      },
    }),
  );

  const corsOrigin = configService.get<string>("CORS_ORIGIN", "*");
  app.enableCors(buildCorsOptions(corsOrigin, isProduction));
  app.use(csrfProtection);
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: isProduction,
    }),
  );

  const swaggerEnabled =
    configService.get<string>("ENABLE_SWAGGER", "false") === "true";

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("EARTHLYN Backend API")
      .setDescription("E-commerce API for sustainable products")
      .setVersion("1.0.0")
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, documentFactory);
  }

  const port = configService.get<number>("PORT", 3001);
  await app.listen(port);
  logger.log(`API running on port ${port}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs enabled at /api/docs`);
  }
}

const processLogger = new Logger("Process");

process.on("uncaughtException", (err) => {
  writeFatalError("[process] Uncaught Exception", err);
  processLogger.error(
    "Uncaught Exception",
    formatFatalError(err),
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  writeFatalError("[process] Unhandled Rejection", reason);
  processLogger.error(
    "Unhandled Rejection",
    formatFatalError(reason),
  );
  process.exit(1);
});

bootstrap().catch((err) => {
  writeFatalError("[bootstrap] Failed to start", err);
  processLogger.error("Failed to start", formatFatalError(err));
  process.exit(1);
});
