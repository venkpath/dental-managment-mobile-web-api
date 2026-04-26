"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
const index_js_1 = require("../user/dto/index.js");
const automation_service_js_1 = require("./automation.service.js");
const automation_cron_js_1 = require("./automation.cron.js");
const index_js_2 = require("./dto/index.js");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const appointment_reminder_config_js_1 = require("../appointment/appointment-reminder.config.js");
let AutomationController = class AutomationController {
    automationService;
    automationCronService;
    prisma;
    reminderQueue;
    constructor(automationService, automationCronService, prisma, reminderQueue) {
        this.automationService = automationService;
        this.automationCronService = automationCronService;
        this.prisma = prisma;
        this.reminderQueue = reminderQueue;
    }
    async getAllRules(clinicId) {
        return this.automationService.getAllRules(clinicId);
    }
    async getRule(clinicId, ruleType) {
        return this.automationService.getRule(clinicId, ruleType);
    }
    async upsertRule(clinicId, ruleType, dto) {
        return this.automationService.upsertRule(clinicId, ruleType, dto);
    }
    async triggerCrons() {
        const results = {};
        const jobs = [
            { name: 'birthdayGreetings', fn: () => this.automationCronService.birthdayGreetings() },
            { name: 'festivalGreetings', fn: () => this.automationCronService.festivalGreetings() },
            { name: 'paymentReminders', fn: () => this.automationCronService.paymentReminders() },
            { name: 'dormantPatientDetection', fn: () => this.automationCronService.dormantPatientDetection() },
            { name: 'treatmentPlanReminders', fn: () => this.automationCronService.treatmentPlanReminders() },
        ];
        for (const job of jobs) {
            try {
                await job.fn();
                results[job.name] = 'success';
            }
            catch (e) {
                results[job.name] = `error: ${e.message}`;
            }
        }
        return { message: 'Automation crons triggered manually', results };
    }
    async triggerSingleCron(jobName) {
        const jobMap = {
            birthdayGreetings: () => this.automationCronService.birthdayGreetings(),
            festivalGreetings: () => this.automationCronService.festivalGreetings(),
            paymentReminders: () => this.automationCronService.paymentReminders(),
            dormantPatientDetection: () => this.automationCronService.dormantPatientDetection(),
            treatmentPlanReminders: () => this.automationCronService.treatmentPlanReminders(),
        };
        const fn = jobMap[jobName];
        if (!fn) {
            throw new (await import('@nestjs/common')).BadRequestException(`Unknown job: ${jobName}. Valid jobs: ${Object.keys(jobMap).join(', ')}`);
        }
        try {
            await fn();
            return { job: jobName, status: 'success' };
        }
        catch (e) {
            return { job: jobName, status: 'error', error: e.message };
        }
    }
    async inspectReminderQueue() {
        const now = Date.now();
        const [delayed, waiting, active, failed, completed] = await Promise.all([
            this.reminderQueue.getDelayed(),
            this.reminderQueue.getWaiting(),
            this.reminderQueue.getActive(),
            this.reminderQueue.getFailed(),
            this.reminderQueue.getCompleted(),
        ]);
        return {
            counts: {
                delayed: delayed.length,
                waiting: waiting.length,
                active: active.length,
                failed: failed.length,
                completed: completed.length,
            },
            delayed: delayed.map((j) => ({
                jobId: j.id,
                appointmentId: j.data['appointmentId'],
                reminderIndex: j.data['reminderIndex'],
                reminderHours: j.data['reminderHours'],
                firesAt: new Date(now + (j.delay ?? 0)).toISOString(),
                firesIn: `${Math.round((j.delay ?? 0) / 60000)} minutes`,
            })),
            active: active.map((j) => ({
                jobId: j.id,
                appointmentId: j.data['appointmentId'],
                reminderIndex: j.data['reminderIndex'],
                reminderHours: j.data['reminderHours'],
            })),
            failed: failed.map((j) => ({
                jobId: j.id,
                appointmentId: j.data['appointmentId'],
                reminderIndex: j.data['reminderIndex'],
                reminderHours: j.data['reminderHours'],
                error: j.failedReason,
                attemptsMade: j.attemptsMade,
            })),
            completed: completed.slice(0, 20).map((j) => ({
                jobId: j.id,
                appointmentId: j.data['appointmentId'],
                reminderIndex: j.data['reminderIndex'],
                reminderHours: j.data['reminderHours'],
            })),
        };
    }
    async retryReminderJob(jobId) {
        const job = await this.reminderQueue.getJob(jobId);
        if (!job)
            return { success: false, error: `Job ${jobId} not found` };
        await job.retry();
        return { success: true, jobId };
    }
    async debugReminderSchedule(clinicId, appointmentId) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { id: true, appointment_date: true, start_time: true, status: true, clinic_id: true },
        });
        if (!appointment)
            return { error: `Appointment ${appointmentId} not found` };
        if (appointment.clinic_id !== clinicId)
            return { error: 'Appointment does not belong to this clinic' };
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const dateStr = appointment.appointment_date.toISOString().split('T')[0];
        const naiveUtc = new Date(`${dateStr}T${appointment.start_time}:00Z`);
        const apptStartUtc = new Date(naiveUtc.getTime() - IST_OFFSET_MS);
        const now = Date.now();
        const rule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
        });
        const config = rule?.config ?? {};
        const preview = !rule
            ? { status: 'no_rule', reminders: [] }
            : !rule.is_enabled
                ? { status: 'rule_disabled', reminders: [] }
                : {
                    status: 'ok',
                    appointmentStartUtc: apptStartUtc.toISOString(),
                    nowUtc: new Date(now).toISOString(),
                    reminders: (0, appointment_reminder_config_js_1.getReminderDefinitions)(config).map((r) => {
                        const sendAt = new Date(apptStartUtc.getTime() - r.hours * 60 * 60 * 1000);
                        const delay = sendAt.getTime() - now;
                        return {
                            reminderIndex: r.index,
                            reminderHours: r.hours,
                            enabled: r.enabled,
                            wouldFireAt: sendAt.toISOString(),
                            wouldFireIn: delay > 0 ? `${Math.round(delay / 60000)} minutes` : null,
                            status: !r.enabled ? 'disabled' : delay <= 0 ? 'already_passed' : 'would_schedule',
                        };
                    }),
                };
        const [queuedJob1, queuedJob2] = await Promise.all([
            this.reminderQueue.getJob(`appointment:${appointmentId}:reminder:1`),
            this.reminderQueue.getJob(`appointment:${appointmentId}:reminder:2`),
        ]);
        return {
            appointment: {
                id: appointment.id,
                date: appointment.appointment_date,
                startTime: appointment.start_time,
                status: appointment.status,
            },
            preview,
            actualQueuedJobs: [
                queuedJob1 ? { jobId: queuedJob1.id, state: await queuedJob1.getState(), firesAt: new Date(Date.now() + (queuedJob1.delay ?? 0)).toISOString() } : null,
                queuedJob2 ? { jobId: queuedJob2.id, state: await queuedJob2.getState(), firesAt: new Date(Date.now() + (queuedJob2.delay ?? 0)).toISOString() } : null,
            ].filter(Boolean),
        };
    }
};
exports.AutomationController = AutomationController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all automation rules for the clinic (creates defaults on first access)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of automation rules with enable/disable status and config' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "getAllRules", null);
__decorate([
    (0, common_1.Get)(':ruleType'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific automation rule' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('ruleType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "getRule", null);
__decorate([
    (0, common_1.Patch)(':ruleType'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Enable/disable or configure an automation rule' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('ruleType')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_2.UpsertAutomationRuleDto]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "upsertRule", null);
__decorate([
    (0, common_1.Post)('trigger-crons'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger all automation crons (birthday, festival, appointment, payment, dormant, treatment)' }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "triggerCrons", null);
__decorate([
    (0, common_1.Post)('trigger/:jobName'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger a single automation cron job by name' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('jobName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "triggerSingleCron", null);
__decorate([
    (0, common_1.Get)('queues/appointment-reminders'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Inspect appointment reminder jobs in the BullMQ queue' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "inspectReminderQueue", null);
__decorate([
    (0, common_1.Post)('queues/appointment-reminders/:jobId/retry'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Retry a failed appointment reminder job' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "retryReminderJob", null);
__decorate([
    (0, common_1.Get)('queues/appointment-reminders/debug/:appointmentId'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Preview what reminders would be/were scheduled for a specific appointment' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('appointmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "debugReminderSchedule", null);
exports.AutomationController = AutomationController = __decorate([
    (0, swagger_1.ApiTags)('Automation Rules'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('AUTOMATION_RULES'),
    (0, common_1.Controller)('automation/rules'),
    __param(3, (0, bullmq_1.InjectQueue)(queue_names_js_1.QUEUE_NAMES.APPOINTMENT_REMINDER)),
    __metadata("design:paramtypes", [automation_service_js_1.AutomationService,
        automation_cron_js_1.AutomationCronService,
        prisma_service_js_1.PrismaService,
        bullmq_2.Queue])
], AutomationController);
//# sourceMappingURL=automation.controller.js.map