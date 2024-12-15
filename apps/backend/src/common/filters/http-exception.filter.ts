import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : this.getExceptionMessage(exceptionResponse, exception.message);

    const errorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };

    const logMessage = `HTTP Exception - Status: ${status}, Message: ${errorResponse.message}`;
    if (status >= 500) {
      this.logger.error(logMessage);
    } else {
      this.logger.warn(logMessage);
    }

    response.status(status).json(errorResponse);
  }

  private getExceptionMessage(response: unknown, fallback: string) {
    if (typeof response !== "object" || response === null) {
      return fallback;
    }

    const message = (response as { message?: string | string[] }).message;
    return message ?? fallback;
  }
}
