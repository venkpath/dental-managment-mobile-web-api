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
        if (!rule?.is_enabled)
            return;
        const config = rule.config ?? {};
        const reminders = [
            {
                index: 1,
                hours: config['reminder_1_hours'] ?? 24,
                enabled: config['reminder_1_enabled'] !== false,
            },
            {
                index: 2,
                hours: config['reminder_2_hours'] ?? 2,
                enabled: config['reminder_2_enabled'] !== false,
            },
        ];
        const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
        for (const reminder of reminders) {
            if (!reminder.enabled)
                continue;
            if (typeof reminder.hours !== 'number' || reminder.hours <= 0)
                continue;
            const sendAt = new Date(apptStartUtc.getTime() - reminder.hours * 60 * 60 * 1000);
            const delay = sendAt.getTime() - Date.now();
            if (delay <= 0) {
                this.logger.debug(`Skipping reminder ${reminder.index} for appointment ${appointmentId} — send time already passed`);
                continue;
            }
            const jobId = `appointment:${appointmentId}:reminder:${reminder.index}`;
            const jobData = {
                appointmentId,
                clinicId,
                reminderIndex: reminder.index,
                reminderHours: reminder.hours,
            };
            await this.reminderQueue.add(exports.APPOINTMENT_REMINDER_JOB, jobData, {
                jobId,
                delay,
                removeOnComplete: true,
                removeOnFail: 100,
            });
            this.logger.log(`Scheduled reminder ${reminder.index} (${reminder.hours}h before) for appointment ${appointmentId} at ${sendAt.toISOString()}`);
        }
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
};
exports.AppointmentReminderProducer = AppointmentReminderProducer;
exports.AppointmentReminderProducer = AppointmentReminderProducer = AppointmentReminderProducer_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(queue_names_js_1.QUEUE_NAMES.APPOINTMENT_REMINDER)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        prisma_service_js_1.PrismaService])
], AppointmentReminderProducer);
//# sourceMappingURL=appointment-reminder.producer.js.map