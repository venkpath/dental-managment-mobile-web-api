import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module.js';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { BranchModule } from './modules/branch/branch.module.js';
import { UserModule } from './modules/user/user.module.js';
import { TestQueueModule } from './modules/test-queue/test-queue.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { QueueModule } from './common/queue/queue.module.js';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import redisConfig from './config/redis.config.js';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    QueueModule,
    HealthModule,
    ClinicModule,
    BranchModule,
    UserModule,
    TestQueueModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*path');
  }
}
