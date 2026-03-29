"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const HTTP_STATUS_CODES = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
};
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (exception instanceof common_1.BadRequestException) {
            const exceptionResponse = exception.getResponse();
            const rawMessage = exceptionResponse['message'];
            const details = Array.isArray(rawMessage) ? rawMessage : [String(rawMessage)];
            const body = {
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request payload',
                    details,
                },
            };
            response.status(common_1.HttpStatus.BAD_REQUEST).json(body);
            return;
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            const { status, body } = this.handlePrismaError(exception);
            response.status(status).json(body);
            return;
        }
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            message =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : exceptionResponse['message']?.toString() ||
                        exception.message;
        }
        const code = HTTP_STATUS_CODES[status] || `HTTP_${status}`;
        if (status >= 500) {
            this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
        }
        const body = {
            success: false,
            error: {
                code,
                message,
            },
        };
        response.status(status).json(body);
    }
    handlePrismaError(exception) {
        switch (exception.code) {
            case 'P2002': {
                const target = exception.meta?.target ?? [];
                const fields = target.length > 0 ? target.join(', ') : 'unknown field';
                return {
                    status: common_1.HttpStatus.CONFLICT,
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
                const cause = exception.meta?.cause || 'Record not found';
                return {
                    status: common_1.HttpStatus.NOT_FOUND,
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
                const field = exception.meta?.field_name || 'unknown';
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
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
                this.logger.error(`Unhandled Prisma error [${exception.code}]`, exception.message);
                return {
                    status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
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
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map