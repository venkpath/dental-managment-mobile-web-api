import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface.js';

const HTTP_STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Validation errors (BadRequestException from class-validator)
    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse() as Record<string, unknown>;
      const rawMessage = exceptionResponse['message'];
      const details = Array.isArray(rawMessage) ? rawMessage : [String(rawMessage)];

      const body: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details,
        },
      };
      response.status(HttpStatus.BAD_REQUEST).json(body);
      return;
    }

    // Prisma known request errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, body } = this.handlePrismaError(exception);
      response.status(status).json(body);
      return;
    }

    // Other HttpExceptions (NotFoundException, ForbiddenException, ConflictException, etc.)
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>)['message']?.toString() ||
            exception.message;
    }

    const code = HTTP_STATUS_CODES[status] || `HTTP_${status}`;

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
      },
    };
    response.status(status).json(body);
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { status: number; body: ApiErrorResponse } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[]) ?? [];
        const fields = target.length > 0 ? target.join(', ') : 'unknown field';
        return {
          status: HttpStatus.CONFLICT,
          body: {
            success: false,
            error: {
              code: 'UNIQUE_CONSTRAINT_VIOLATION',
              message: `A record with this ${fields} already exists`,
            },
          },
        };
      }
      case 'P2025': {
        const cause = (exception.meta?.cause as string) || 'Record not found';
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            success: false,
            error: {
              code: 'RECORD_NOT_FOUND',
              message: cause,
            },
          },
        };
      }
      case 'P2003': {
        const field = (exception.meta?.field_name as string) || 'unknown';
        return {
          status: HttpStatus.BAD_REQUEST,
          body: {
            success: false,
            error: {
              code: 'FOREIGN_KEY_VIOLATION',
              message: `Related record not found for field: ${field}`,
            },
          },
        };
      }
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            success: false,
            error: {
              code: 'DATABASE_ERROR',
              message: 'An unexpected database error occurred',
            },
          },
        };
    }
  }
}
