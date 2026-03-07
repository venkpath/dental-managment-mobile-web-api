import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from './http-exception.filter.js';

function createMockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
    }),
    json,
    status,
  };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('validation errors (BadRequestException)', () => {
    it('should return VALIDATION_ERROR format with array of details', () => {
      const host = createMockHost();
      const exception = new BadRequestException({
        message: ['name must be a string', 'email must be an email'],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: ['name must be a string', 'email must be an email'],
        },
      });
    });

    it('should handle single string message in BadRequestException', () => {
      const host = createMockHost();
      const exception = new BadRequestException('Missing required field');

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: ['Missing required field'],
        },
      });
    });

    it('should handle forbidNonWhitelisted validation errors', () => {
      const host = createMockHost();
      const exception = new BadRequestException({
        message: ['property unknownField should not exist'],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, host as any);

      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: ['property unknownField should not exist'],
        },
      });
    });
  });

  describe('non-validation HttpExceptions', () => {
    it('should handle NotFoundException with error code NOT_FOUND', () => {
      const host = createMockHost();
      const exception = new NotFoundException('Patient not found');

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found',
        },
      });
    });

    it('should handle ForbiddenException with error code FORBIDDEN', () => {
      const host = createMockHost();
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    });

    it('should handle UnauthorizedException with error code UNAUTHORIZED', () => {
      const host = createMockHost();
      const exception = new UnauthorizedException('Invalid token');

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      });
    });

    it('should handle ConflictException with error code CONFLICT', () => {
      const host = createMockHost();
      const exception = new ConflictException('Resource already exists');

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
      });
    });

    it('should handle generic HttpException with object response', () => {
      const host = createMockHost();
      const exception = new HttpException(
        { message: 'Custom error', statusCode: 422 },
        422,
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(422);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNPROCESSABLE_ENTITY',
          message: 'Custom error',
        },
      });
    });

    it('should handle generic HttpException with string response', () => {
      const host = createMockHost();
      const exception = new HttpException('Something went wrong', 500);

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(500);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        },
      });
    });

    it('should handle unmapped HTTP status codes with HTTP_ prefix', () => {
      const host = createMockHost();
      const exception = new HttpException('Teapot', 418);

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(418);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'HTTP_418',
          message: 'Teapot',
        },
      });
    });
  });

  describe('Prisma errors', () => {
    it('should handle P2002 unique constraint violation with target fields', () => {
      const host = createMockHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.0.0', meta: { target: ['email'] } },
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this email already exists',
        },
      });
    });

    it('should handle P2002 with multiple target fields', () => {
      const host = createMockHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.0.0', meta: { target: ['plan_id', 'feature_id'] } },
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this plan_id, feature_id already exists',
        },
      });
    });

    it('should handle P2002 without target meta', () => {
      const host = createMockHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.0.0' },
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this unknown field already exists',
        },
      });
    });

    it('should handle P2025 record not found', () => {
      const host = createMockHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '7.0.0', meta: { cause: 'Record to update not found.' } },
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Record to update not found.',
        },
      });
    });

    it('should handle P2025 without cause meta', () => {
      const host = createMockHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '7.0.0' },
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found',
        },
      });
    });

    it('should handle P2003 foreign key violation', () => {
      const host = createMockHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '7.0.0', meta: { field_name: 'patient_id' } },
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Related record not found for field: patient_id',
        },
      });
    });

    it('should handle unknown Prisma error codes as 500', () => {
      const host = createMockHost();
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Some other error',
        { code: 'P2999', clientVersion: '7.0.0' },
      );

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'An unexpected database error occurred',
        },
      });
    });
  });

  describe('unknown exceptions', () => {
    it('should return 500 for unknown errors', () => {
      const host = createMockHost();
      const exception = new Error('Unexpected crash');

      filter.catch(exception, host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    });

    it('should return 500 for non-Error objects', () => {
      const host = createMockHost();

      filter.catch('string error', host as any);

      expect(host.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(host.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    });
  });
});
