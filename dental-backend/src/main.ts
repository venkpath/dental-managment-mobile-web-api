import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { initSentry } from './config/sentry.config.js';
import { validateEnvVars } from './config/env-validation.js';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { SanitizeInputPipe } from './common/pipes/sanitize-input.pipe.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor.js';
import { AuditLogService } from './modules/audit-log/audit-log.service.js';
import { setupSwagger } from './config/swagger.config.js';
import { Logger } from 'nestjs-pino';

// Initialize Sentry before app creation
initSentry();

// Validate environment variables
validateEnvVars();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow cross-origin resources (e.g. images)
    }),
  );

  // Cookie parser for secure cookie handling
  app.use(cookieParser());

  app.enableCors({
    origin: process.env['CORS_ORIGIN']
      ? process.env['CORS_ORIGIN'].split(',')
      : 'http://localhost:3001',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // AuditLogInterceptor MUST be registered before ResponseInterceptor
  // so tap() sees the raw response {id: '...'} before it's wrapped in {success, data}
  const auditLogService = app.get(AuditLogService);
  app.useGlobalInterceptors(
    new AuditLogInterceptor(auditLogService),
    new ResponseInterceptor(),
  );

  setupSwagger(app);

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
}
void bootstrap();
