import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module.js';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { BranchModule } from './modules/branch/branch.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PlanModule } from './modules/plan/plan.module.js';
import { FeatureModule } from './modules/feature/feature.module.js';
import { SuperAdminModule } from './modules/super-admin/super-admin.module.js';
import { TestQueueModule } from './modules/test-queue/test-queue.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { QueueModule } from './common/queue/queue.module.js';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import redisConfig from './config/redis.config.js';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware.js';
import { PasswordModule } from './common/services/password.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { SuperAdminGuard } from './common/guards/super-admin.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    PasswordModule,
    QueueModule,
    HealthModule,
    ClinicModule,
    BranchModule,
    UserModule,
    AuthModule,
    PlanModule,
    FeatureModule,
    SuperAdminModule,
    TestQueueModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SuperAdminGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*path');
  }
}
