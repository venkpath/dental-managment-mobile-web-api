import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor.js';
import { AuditLogService } from './modules/audit-log/audit-log.service.js';
import { setupSwagger } from './config/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3001',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
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
