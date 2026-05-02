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
        const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
        const patientRule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
        });
        if (!patientRule) {
            this.logger.warn(`No appointment_reminder_patient rule for clinic ${clinicId} — patient reminders skipped`);
        }
        else if (!patientRule.is_enabled) {
            this.logger.warn(`appointment_reminder_patient DISABLED for clinic ${clinicId} — patient reminders skipped`);
        }
        else {
            const config = patientRule.config ?? {};
            const reminders = (0, appointment_reminder_config_js_1.getReminderDefinitions)(config);
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
                const jobId = `appointment-${appointmentId}-reminder-${reminder.index}`;
                const jobData = {
                    kind: 'patient',
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
        await this.scheduleDentistReminder(appointmentId, clinicId, apptStartUtc);
    }
    async scheduleDentistReminder(appointmentId, clinicId, apptStartUtc) {
        const dentistRule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_dentist' } },
        });
        if (!dentistRule) {
            this.logger.log(`No appointment_reminder_dentist rule for clinic ${clinicId} — dentist reminder skipped`);
            return;
        }
        if (!dentistRule.is_enabled) {
            this.logger.log(`appointment_reminder_dentist DISABLED for clinic ${clinicId} — dentist reminder skipped`);
            return;
        }
        const def = (0, appointment_reminder_config_js_1.getDentistReminderDefinition)(dentistRule.config ?? {});
        const sendAt = new Date(apptStartUtc.getTime() - def.hours * 60 * 60 * 1000);
        const delay = sendAt.getTime() - Date.now();
        if (delay <= 0) {
            this.logger.warn(`Skipping dentist reminder for appointment ${appointmentId} — fire time ${sendAt.toISOString()} already passed (${def.hours}h before appointment).`);
            return;
        }
        const jobId = `appointment-${appointmentId}-reminder-dentist`;
        const jobData = {
            kind: 'dentist',
            appointmentId,
            clinicId,
            reminderHours: def.hours,
        };
        try {
            await this.reminderQueue.add(exports.APPOINTMENT_REMINDER_JOB, jobData, {
                jobId,
                delay,
                removeOnComplete: true,
                removeOnFail: 100,
            });
            this.logger.log(`Scheduled dentist reminder (${def.hours}h before) for appointment ${appointmentId} at ${sendAt.toISOString()} [jobId=${jobId}]`);
        }
        catch (e) {
            this.logger.error(`FAILED to enqueue dentist reminder for appointment ${appointmentId} (jobId=${jobId}): ${e.message}`, e.stack);
            throw e;
        }
    }
    async scheduleRemindersWithResult(appointmentId, clinicId, appointmentDate, startTime) {
        const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
        const results = [];
        const patientRule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
        });
        let overallStatus = 'ok';
        if (!patientRule) {
            overallStatus = 'no_rule';
        }
        else if (!patientRule.is_enabled) {
            overallStatus = 'rule_disabled';
        }
        else {
            const config = patientRule.config ?? {};
            const reminders = (0, appointment_reminder_config_js_1.getReminderDefinitions)(config);
            for (const reminder of reminders) {
                results.push(await this.tryScheduleSlot({
                    appointmentId,
                    clinicId,
                    apptStartUtc,
                    kind: 'patient',
                    reminderIndex: reminder.index,
                    hours: reminder.hours,
                    enabled: reminder.enabled,
                    jobId: `appointment-${appointmentId}-reminder-${reminder.index}`,
                    jobData: {
                        kind: 'patient',
                        appointmentId,
                        clinicId,
                        reminderIndex: reminder.index,
                        reminderHours: reminder.hours,
                    },
                }));
            }
        }
        const dentistRule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_dentist' } },
        });
        if (dentistRule && dentistRule.is_enabled) {
            const def = (0, appointment_reminder_config_js_1.getDentistReminderDefinition)(dentistRule.config ?? {});
            results.push(await this.tryScheduleSlot({
                appointmentId,
                clinicId,
                apptStartUtc,
                kind: 'dentist',
                hours: def.hours,
                enabled: true,
                jobId: `appointment-${appointmentId}-reminder-dentist`,
                jobData: {
                    kind: 'dentist',
                    appointmentId,
                    clinicId,
                    reminderHours: def.hours,
                },
            }));
        }
        else if (dentistRule) {
            results.push({ kind: 'dentist', reminderHours: 0, status: 'disabled' });
        }
        return { overallStatus, results };
    }
    async tryScheduleSlot(args) {
        const { kind, reminderIndex, hours, enabled, jobId, apptStartUtc, jobData, appointmentId } = args;
        if (!enabled)
            return { kind, reminderIndex, reminderHours: hours, status: 'disabled' };
        const sendAt = new Date(apptStartUtc.getTime() - hours * 60 * 60 * 1000);
        const delay = sendAt.getTime() - Date.now();
        if (delay <= 0) {
            return {
                kind, reminderIndex, reminderHours: hours,
                status: 'already_passed', firesAt: sendAt.toISOString(),
            };
        }
        const existing = await this.reminderQueue.getJob(jobId).catch(() => null);
        if (existing) {
            return {
                kind, reminderIndex, reminderHours: hours,
                status: 'already_scheduled', jobId, firesAt: sendAt.toISOString(),
            };
        }
        try {
            await this.reminderQueue.add(exports.APPOINTMENT_REMINDER_JOB, jobData, {
                jobId, delay, removeOnComplete: true, removeOnFail: 100,
            });
            this.logger.log(`[force] Scheduled ${kind} reminder${reminderIndex ? ' ' + reminderIndex : ''} for appointment ${appointmentId} [jobId=${jobId}]`);
            return {
                kind, reminderIndex, reminderHours: hours,
                status: 'scheduled', jobId, firesAt: sendAt.toISOString(),
            };
        }
        catch (e) {
            const msg = e.message;
            this.logger.error(`[force] FAILED to enqueue ${kind} reminder for appointment ${appointmentId}: ${msg}`, e.stack);
            return { kind, reminderIndex, reminderHours: hours, status: 'failed', error: msg };
        }
    }
    async cancelReminders(appointmentId) {
        const slotIds = [
            `appointment-${appointmentId}-reminder-1`,
            `appointment-${appointmentId}-reminder-2`,
            `appointment-${appointmentId}-reminder-dentist`,
        ];
        for (const jobId of slotIds) {
            const job = await this.reminderQueue.getJob(jobId);
            if (job) {
                await job.remove();
                this.logger.log(`Cancelled ${jobId}`);
            }
        }
    }
    async rescheduleReminders(appointmentId, clinicId, newAppointmentDate, newStartTime) {
        await this.cancelReminders(appointmentId);
        await this.scheduleReminders(appointmentId, clinicId, newAppointmentDate, newStartTime);
    }
    async previewReminders(appointmentId, clinicId, appointmentDate, startTime) {
        const now = Date.now();
        const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
        const [patientRule, dentistRule] = await Promise.all([
            this.prisma.automationRule.findUnique({
                where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
            }),
            this.prisma.automationRule.findUnique({
                where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_dentist' } },
            }),
        ]);
        const reminders = [];
        if (patientRule?.is_enabled) {
            const config = patientRule.config ?? {};
            for (const r of (0, appointment_reminder_config_js_1.getReminderDefinitions)(config)) {
                const sendAt = new Date(apptStartUtc.getTime() - r.hours * 60 * 60 * 1000);
                const delay = sendAt.getTime() - now;
                reminders.push({
                    kind: 'patient',
                    reminderIndex: r.index,
                    reminderHours: r.hours,
                    firesAt: sendAt.toISOString(),
                    wouldFireIn: delay > 0 ? `${Math.round(delay / 60000)} minutes` : null,
                    status: !r.enabled ? 'disabled' : delay <= 0 ? 'already_passed' : 'would_schedule',
                });
            }
        }
        if (dentistRule?.is_enabled) {
            const def = (0, appointment_reminder_config_js_1.getDentistReminderDefinition)(dentistRule.config ?? {});
            const sendAt = new Date(apptStartUtc.getTime() - def.hours * 60 * 60 * 1000);
            const delay = sendAt.getTime() - now;
            reminders.push({
                kind: 'dentist',
                reminderHours: def.hours,
                firesAt: sendAt.toISOString(),
                wouldFireIn: delay > 0 ? `${Math.round(delay / 60000)} minutes` : null,
                status: delay <= 0 ? 'already_passed' : 'would_schedule',
            });
        }
        else if (dentistRule) {
            reminders.push({ kind: 'dentist', reminderHours: 0, status: 'disabled' });
        }
        const status = !patientRule ? 'no_rule'
            : !patientRule.is_enabled ? 'rule_disabled'
                : 'ok';
        return {
            status,
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