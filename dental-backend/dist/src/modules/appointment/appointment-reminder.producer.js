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
var AppointmentReminderProducer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentReminderProducer = exports.APPOINTMENT_REMINDER_JOB = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
const appointment_reminder_config_js_1 = require("./appointment-reminder.config.js");
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function appointmentStartUtc(appointmentDate, startTime) {
    const dateStr = appointmentDate.toISOString().split('T')[0];
    const naiveUtc = new Date(`${dateStr}T${startTime}:00Z`);
    return new Date(naiveUtc.getTime() - IST_OFFSET_MS);
}
exports.APPOINTMENT_REMINDER_JOB = 'send-appointment-reminder';
let AppointmentReminderProducer = AppointmentReminderProducer_1 = class AppointmentReminderProducer {
    reminderQueue;
    prisma;
    logger = new common_1.Logger(AppointmentReminderProducer_1.name);
    constructor(reminderQueue, prisma) {
        this.reminderQueue = reminderQueue;
        this.prisma = prisma;
    }
    async scheduleReminders(appointmentId, clinicId, appointmentDate, startTime) {
        const rule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
        });
        if (!rule) {
            this.logger.warn(`No automation rule found for clinic ${clinicId} — appointment reminders skipped`);
            return;
        }
        if (!rule.is_enabled) {
            this.logger.warn(`Appointment reminder rule is DISABLED for clinic ${clinicId} — reminders skipped`);
            return;
        }
        const config = rule.config ?? {};
        const reminders = (0, appointment_reminder_config_js_1.getReminderDefinitions)(config);
        const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
        for (const reminder of reminders) {
            if (!reminder.enabled) {
                this.logger.log(`Reminder ${reminder.index} is disabled in config for clinic ${clinicId}`);
                continue;
            }
            const sendAt = new Date(apptStartUtc.getTime() - reminder.hours * 60 * 60 * 1000);
            const delay = sendAt.getTime() - Date.now();
            if (delay <= 0) {
                this.logger.warn(`Skipping reminder ${reminder.index} for appointment ${appointmentId} — fire time ${sendAt.toISOString()} already passed (${reminder.hours}h before appointment). Create appointment further in advance.`);
                continue;
            }
            const jobId = `appointment:${appointmentId}:reminder:${reminder.index}`;
            const jobData = {
                appointmentId,
                clinicId,
                reminderIndex: reminder.index,
                reminderHours: reminder.hours,
            };
            try {
                await this.reminderQueue.add(exports.APPOINTMENT_REMINDER_JOB, jobData, {
                    jobId,
                    delay,
                    removeOnComplete: true,
                    removeOnFail: 100,
                });
                this.logger.log(`Scheduled reminder ${reminder.index} (${reminder.hours}h before) for appointment ${appointmentId} at ${sendAt.toISOString()} [jobId=${jobId}]`);
            }
            catch (e) {
                this.logger.error(`FAILED to enqueue reminder ${reminder.index} for appointment ${appointmentId} (jobId=${jobId}): ${e.message}`, e.stack);
                throw e;
            }
        }
    }
    async scheduleRemindersWithResult(appointmentId, clinicId, appointmentDate, startTime) {
        const rule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
        });
        if (!rule)
            return { overallStatus: 'no_rule', results: [] };
        if (!rule.is_enabled)
            return { overallStatus: 'rule_disabled', results: [] };
        const config = rule.config ?? {};
        const reminders = (0, appointment_reminder_config_js_1.getReminderDefinitions)(config);
        const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
        const results = [];
        for (const reminder of reminders) {
            if (!reminder.enabled) {
                results.push({ reminderIndex: reminder.index, reminderHours: reminder.hours, status: 'disabled' });
                continue;
            }
            const sendAt = new Date(apptStartUtc.getTime() - reminder.hours * 60 * 60 * 1000);
            const delay = sendAt.getTime() - Date.now();
            if (delay <= 0) {
                results.push({ reminderIndex: reminder.index, reminderHours: reminder.hours, status: 'already_passed', firesAt: sendAt.toISOString() });
                continue;
            }
            const jobId = `appointment:${appointmentId}:reminder:${reminder.index}`;
            const existing = await this.reminderQueue.getJob(jobId).catch(() => null);
            if (existing) {
                results.push({
                    reminderIndex: reminder.index,
                    reminderHours: reminder.hours,
                    status: 'already_scheduled',
                    jobId,
                    firesAt: sendAt.toISOString(),
                });
                continue;
            }
            try {
                await this.reminderQueue.add(exports.APPOINTMENT_REMINDER_JOB, { appointmentId, clinicId, reminderIndex: reminder.index, reminderHours: reminder.hours }, { jobId, delay, removeOnComplete: true, removeOnFail: 100 });
                this.logger.log(`[force] Scheduled reminder ${reminder.index} for appointment ${appointmentId} [jobId=${jobId}]`);
                results.push({
                    reminderIndex: reminder.index,
                    reminderHours: reminder.hours,
                    status: 'scheduled',
                    jobId,
                    firesAt: sendAt.toISOString(),
                });
            }
            catch (e) {
                const msg = e.message;
                this.logger.error(`[force] FAILED to enqueue reminder ${reminder.index} for appointment ${appointmentId}: ${msg}`, e.stack);
                results.push({
                    reminderIndex: reminder.index,
                    reminderHours: reminder.hours,
                    status: 'failed',
                    error: msg,
                });
            }
        }
        return { overallStatus: 'ok', results };
    }
    async cancelReminders(appointmentId) {
        for (const idx of [1, 2]) {
            const jobId = `appointment:${appointmentId}:reminder:${idx}`;
            const job = await this.reminderQueue.getJob(jobId);
            if (job) {
                await job.remove();
                this.logger.log(`Cancelled reminder ${idx} for appointment ${appointmentId}`);
            }
        }
    }
    async rescheduleReminders(appointmentId, clinicId, newAppointmentDate, newStartTime) {
        await this.cancelReminders(appointmentId);
        await this.scheduleReminders(appointmentId, clinicId, newAppointmentDate, newStartTime);
    }
    async previewReminders(appointmentId, clinicId, appointmentDate, startTime) {
        const now = Date.now();
        const rule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
        });
        if (!rule)
            return { status: 'no_rule', reminders: [] };
        if (!rule.is_enabled)
            return { status: 'rule_disabled', reminders: [] };
        const config = rule.config ?? {};
        const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
        const reminders = (0, appointment_reminder_config_js_1.getReminderDefinitions)(config).map((r) => {
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
        });
        return {
            status: 'ok',
            appointmentId,
            appointmentStartUtc: apptStartUtc.toISOString(),
            nowUtc: new Date(now).toISOString(),
            reminders,
        };
    }
};
exports.AppointmentReminderProducer = AppointmentReminderProducer;
exports.AppointmentReminderProducer = AppointmentReminderProducer = AppointmentReminderProducer_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(queue_names_js_1.QUEUE_NAMES.APPOINTMENT_REMINDER)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        prisma_service_js_1.PrismaService])
], AppointmentReminderProducer);
//# sourceMappingURL=appointment-reminder.producer.js.map