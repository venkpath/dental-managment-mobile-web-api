import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogController } from './audit-log.controller.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor.js';

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
