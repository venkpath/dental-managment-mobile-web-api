"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const health_module_js_1 = require("./modules/health/health.module.js");
const clinic_module_js_1 = require("./modules/clinic/clinic.module.js");
const branch_module_js_1 = require("./modules/branch/branch.module.js");
const user_module_js_1 = require("./modules/user/user.module.js");
const auth_module_js_1 = require("./modules/auth/auth.module.js");
const plan_module_js_1 = require("./modules/plan/plan.module.js");
const feature_module_js_1 = require("./modules/feature/feature.module.js");
const super_admin_module_js_1 = require("./modules/super-admin/super-admin.module.js");
const patient_module_js_1 = require("./modules/patient/patient.module.js");
const appointment_module_js_1 = require("./modules/appointment/appointment.module.js");
const treatment_module_js_1 = require("./modules/treatment/treatment.module.js");
const clinical_visit_module_js_1 = require("./modules/clinical-visit/clinical-visit.module.js");
const prescription_module_js_1 = require("./modules/prescription/prescription.module.js");
const consent_module_js_1 = require("./modules/consent/consent.module.js");
const invoice_module_js_1 = require("./modules/invoice/invoice.module.js");
const inventory_module_js_1 = require("./modules/inventory/inventory.module.js");
const attachment_module_js_1 = require("./modules/attachment/attachment.module.js");
const audit_log_module_js_1 = require("./modules/audit-log/audit-log.module.js");
const notification_module_js_1 = require("./modules/notification/notification.module.js");
const communication_module_js_1 = require("./modules/communication/communication.module.js");
const tooth_chart_module_js_1 = require("./modules/tooth-chart/tooth-chart.module.js");
const reports_module_js_1 = require("./modules/reports/reports.module.js");
const campaign_module_js_1 = require("./modules/campaign/campaign.module.js");
const automation_module_js_1 = require("./modules/automation/automation.module.js");
const referral_module_js_1 = require("./modules/referral/referral.module.js");
const feedback_module_js_1 = require("./modules/feedback/feedback.module.js");
const clinic_events_module_js_1 = require("./modules/clinic-events/clinic-events.module.js");
const test_queue_module_js_1 = require("./modules/test-queue/test-queue.module.js");
const prisma_module_js_1 = require("./database/prisma.module.js");
const queue_module_js_1 = require("./common/queue/queue.module.js");
const app_config_js_1 = __importDefault(require("./config/app.config.js"));
const database_config_js_1 = __importDefault(require("./config/database.config.js"));
const redis_config_js_1 = __importDefault(require("./config/redis.config.js"));
const tenant_context_middleware_js_1 = require("./common/middleware/tenant-context.middleware.js");
const password_module_js_1 = require("./common/services/password.module.js");
const plan_limit_module_js_1 = require("./common/services/plan-limit.module.js");
const jwt_auth_guard_js_1 = require("./common/guards/jwt-auth.guard.js");
const roles_guard_js_1 = require("./common/guards/roles.guard.js");
const super_admin_guard_js_1 = require("./common/guards/super-admin.guard.js");
const feature_guard_js_1 = require("./common/guards/feature.guard.js");
const ai_usage_guard_js_1 = require("./common/guards/ai-usage.guard.js");
const csrf_guard_js_1 = require("./common/guards/csrf.guard.js");
const subscription_guard_js_1 = require("./common/guards/subscription.guard.js");
const csrf_module_js_1 = require("./modules/csrf/csrf.module.js");
const sentry_module_js_1 = require("./modules/sentry/sentry.module.js");
const backup_module_js_1 = require("./modules/backup/backup.module.js");
const data_export_module_js_1 = require("./modules/data-export/data-export.module.js");
const payment_module_js_1 = require("./modules/payment/payment.module.js");
const ai_module_js_1 = require("./modules/ai/ai.module.js");
const public_booking_module_js_1 = require("./modules/public-booking/public-booking.module.js");
const expense_module_js_1 = require("./modules/expense/expense.module.js");
const membership_module_js_1 = require("./modules/membership/membership.module.js");
const demo_request_module_js_1 = require("./modules/demo-request/demo-request.module.js");
const platform_billing_module_js_1 = require("./modules/platform-billing/platform-billing.module.js");
const branch_scope_interceptor_js_1 = require("./common/interceptors/branch-scope.interceptor.js");
const activity_tracker_interceptor_js_1 = require("./common/interceptors/activity-tracker.interceptor.js");
const suspension_guard_js_1 = require("./common/guards/suspension.guard.js");
const nestjs_pino_1 = require("nestjs-pino");
const razorpay_config_js_1 = __importDefault(require("./config/razorpay.config.js"));
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_context_middleware_js_1.TenantContextMiddleware).forRoutes('*path');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            sentry_module_js_1.SentryModule,
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    transport: process.env['NODE_ENV'] !== 'production'
                        ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
                        : undefined,
                    level: process.env['LOG_LEVEL'] || 'info',
                    autoLogging: true,
                    redact: ['req.headers.authorization', 'req.headers.cookie'],
                },
            }),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_js_1.default, database_config_js_1.default, redis_config_js_1.default, razorpay_config_js_1.default],
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot({
                throttlers: [
                    { name: 'default', ttl: 60000, limit: 100 },
                    { name: 'strict', ttl: 60000, limit: 10 },
                ],
                errorMessage: 'Too many requests. Please try again later.',
            }),
            prisma_module_js_1.PrismaModule,
            schedule_1.ScheduleModule.forRoot(),
            password_module_js_1.PasswordModule,
            plan_limit_module_js_1.PlanLimitModule,
            queue_module_js_1.QueueModule,
            health_module_js_1.HealthModule,
            clinic_module_js_1.ClinicModule,
            branch_module_js_1.BranchModule,
            user_module_js_1.UserModule,
            auth_module_js_1.AuthModule,
            plan_module_js_1.PlanModule,
            feature_module_js_1.FeatureModule,
            super_admin_module_js_1.SuperAdminModule,
            patient_module_js_1.PatientModule,
            appointment_module_js_1.AppointmentModule,
            treatment_module_js_1.TreatmentModule,
            clinical_visit_module_js_1.ClinicalVisitModule,
            prescription_module_js_1.PrescriptionModule,
            consent_module_js_1.ConsentModule,
            invoice_module_js_1.InvoiceModule,
            inventory_module_js_1.InventoryModule,
            attachment_module_js_1.AttachmentModule,
            audit_log_module_js_1.AuditLogModule,
            notification_module_js_1.NotificationModule,
            communication_module_js_1.CommunicationModule,
            tooth_chart_module_js_1.ToothChartModule,
            reports_module_js_1.ReportsModule,
            campaign_module_js_1.CampaignModule,
            automation_module_js_1.AutomationModule,
            referral_module_js_1.ReferralModule,
            feedback_module_js_1.FeedbackModule,
            clinic_events_module_js_1.ClinicEventsModule,
            test_queue_module_js_1.TestQueueModule,
            csrf_module_js_1.CsrfModule,
            backup_module_js_1.BackupModule,
            data_export_module_js_1.DataExportModule,
            payment_module_js_1.PaymentModule,
            ai_module_js_1.AiModule,
            public_booking_module_js_1.PublicBookingModule,
            expense_module_js_1.ExpenseModule,
            membership_module_js_1.MembershipModule,
            demo_request_module_js_1.DemoRequestModule,
            platform_billing_module_js_1.PlatformBillingModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_js_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_js_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: suspension_guard_js_1.SuspensionGuard },
            { provide: core_1.APP_GUARD, useClass: super_admin_guard_js_1.SuperAdminGuard },
            { provide: core_1.APP_GUARD, useClass: feature_guard_js_1.FeatureGuard },
            { provide: core_1.APP_GUARD, useClass: ai_usage_guard_js_1.AiUsageGuard },
            { provide: core_1.APP_GUARD, useClass: subscription_guard_js_1.SubscriptionGuard },
            { provide: core_1.APP_GUARD, useClass: csrf_guard_js_1.CsrfGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: branch_scope_interceptor_js_1.BranchScopeInterceptor },
            { provide: core_1.APP_INTERCEPTOR, useClass: activity_tracker_interceptor_js_1.ActivityTrackerInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map