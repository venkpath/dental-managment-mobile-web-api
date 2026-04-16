import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module.js';
import { ClinicModule } from './modules/clinic/clinic.module.js';
import { BranchModule } from './modules/branch/branch.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PlanModule } from './modules/plan/plan.module.js';
import { FeatureModule } from './modules/feature/feature.module.js';
import { SuperAdminModule } from './modules/super-admin/super-admin.module.js';
import { PatientModule } from './modules/patient/patient.module.js';
import { AppointmentModule } from './modules/appointment/appointment.module.js';
import { TreatmentModule } from './modules/treatment/treatment.module.js';
import { ClinicalVisitModule } from './modules/clinical-visit/clinical-visit.module.js';
import { PrescriptionModule } from './modules/prescription/prescription.module.js';
import { InvoiceModule } from './modules/invoice/invoice.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { AttachmentModule } from './modules/attachment/attachment.module.js';
import { AuditLogModule } from './modules/audit-log/audit-log.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { CommunicationModule } from './modules/communication/communication.module.js';
import { ToothChartModule } from './modules/tooth-chart/tooth-chart.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { CampaignModule } from './modules/campaign/campaign.module.js';
import { AutomationModule } from './modules/automation/automation.module.js';
import { ReferralModule } from './modules/referral/referral.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { ClinicEventsModule } from './modules/clinic-events/clinic-events.module.js';
import { TestQueueModule } from './modules/test-queue/test-queue.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { QueueModule } from './common/queue/queue.module.js';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import redisConfig from './config/redis.config.js';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware.js';
import { PasswordModule } from './common/services/password.module.js';
import { PlanLimitModule } from './common/services/plan-limit.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { SuperAdminGuard } from './common/guards/super-admin.guard.js';
import { FeatureGuard } from './common/guards/feature.guard.js';
import { AiUsageGuard } from './common/guards/ai-usage.guard.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';
import { SubscriptionGuard } from './common/guards/subscription.guard.js';
import { CsrfModule } from './modules/csrf/csrf.module.js';
import { SentryModule } from './modules/sentry/sentry.module.js';
import { BackupModule } from './modules/backup/backup.module.js';
import { DataExportModule } from './modules/data-export/data-export.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { PublicBookingModule } from './modules/public-booking/public-booking.module.js';
import { ExpenseModule } from './modules/expense/expense.module.js';
import { MembershipModule } from './modules/membership/membership.module.js';
import { LoggerModule } from 'nestjs-pino';
import razorpayConfig from './config/razorpay.config.js';

@Module({
  imports: [
    SentryModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        level: process.env['LOG_LEVEL'] || 'info',
        autoLogging: true,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, razorpayConfig],
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: 60000, limit: 100 },
        { name: 'strict', ttl: 60000, limit: 10 },
      ],
      errorMessage: 'Too many requests. Please try again later.',
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    PasswordModule,
    PlanLimitModule,
    QueueModule,
    HealthModule,
    ClinicModule,
    BranchModule,
    UserModule,
    AuthModule,
    PlanModule,
    FeatureModule,
    SuperAdminModule,
    PatientModule,
    AppointmentModule,
    TreatmentModule,
    ClinicalVisitModule,
    PrescriptionModule,
    InvoiceModule,
    InventoryModule,
    AttachmentModule,
    AuditLogModule,
    NotificationModule,
    CommunicationModule,
    ToothChartModule,
    ReportsModule,
    CampaignModule,
    AutomationModule,
    ReferralModule,
    FeedbackModule,
    ClinicEventsModule,
    TestQueueModule,
    CsrfModule,
    BackupModule,
    DataExportModule,
    PaymentModule,
    AiModule,
    PublicBookingModule,
    ExpenseModule,
    MembershipModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SuperAdminGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
    { provide: APP_GUARD, useClass: AiUsageGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*path');
  }
}
