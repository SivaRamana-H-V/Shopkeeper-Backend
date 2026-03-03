import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as Record<string, unknown>).message as string) ?? message;
      details =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as Record<string, unknown>).details
          : undefined;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.mapPrismaError(exception);
      message = this.getPrismaErrorMessage(exception);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    if (details !== undefined) {
      body.details = details;
    }

    response.status(status).json(body);
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): number {
    switch (error.code) {
      case 'P2002': return HttpStatus.CONFLICT;
      case 'P2025': return HttpStatus.NOT_FOUND;
      case 'P2003': return HttpStatus.BAD_REQUEST;
      case 'P2014': return HttpStatus.BAD_REQUEST;
      default:      return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getPrismaErrorMessage(error: Prisma.PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002': return 'A record with this value already exists';
      case 'P2025': return 'The requested record was not found';
      case 'P2003': return 'Related record not found';
      default:      return 'Database operation failed';
    }
  }
}
