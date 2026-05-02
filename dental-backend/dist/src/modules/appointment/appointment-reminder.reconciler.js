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
var AppointmentReminderReconciler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentReminderReconciler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const appointment_reminder_producer_js_1 = require("./appointment-reminder.producer.js");
const CLINIC_TIMEZONE = 'Asia/Kolkata';
function getDateStrInClinicTz(date) {
    return date.toLocaleDateString('en-CA', { timeZone: CLINIC_TIMEZONE });
}
function addDaysToDateStr(dateStr, days) {
    const d = new Date(`${dateStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}
let AppointmentReminderReconciler = AppointmentReminderReconciler_1 = class AppointmentReminderReconciler {
    prisma;
    reminderProducer;
    logger = new common_1.Logger(AppointmentReminderReconciler_1.name);
    constructor(prisma, reminderProducer) {
        this.prisma = prisma;
        this.reminderProducer = reminderProducer;
    }
    async reconcileUpcomingReminderJobs() {
        const today = getDateStrInClinicTz(new Date());
        const maxDate = addDaysToDateStr(today, 2);
        const upcoming = await this.prisma.appointment.findMany({
            where: {
                status: 'scheduled',
                appointment_date: {
                    gte: new Date(today),
                    lte: new Date(maxDate),
                },
            },
            select: {
                id: true,
                clinic_id: true,
                appointment_date: true,
                start_time: true,
            },
            take: 1000,
            orderBy: { appointment_date: 'asc' },
        });
        if (upcoming.length === 0)
            return;
        const results = await Promise.allSettled(upcoming.map((appt) => this.reminderProducer.scheduleReminders(appt.id, appt.clinic_id, appt.appointment_date, appt.start_time)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) {
            this.logger.warn(`Reminder reconciliation completed with failures: ${failed}/${upcoming.length}`);
            return;
        }
        this.logger.debug(`Reminder reconciliation complete for ${upcoming.length} upcoming appointments`);
    }
};
exports.AppointmentReminderReconciler = AppointmentReminderReconciler;
__decorate([
    (0, schedule_1.Cron)('0 0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppointmentReminderReconciler.prototype, "reconcileUpcomingReminderJobs", null);
exports.AppointmentReminderReconciler = AppointmentReminderReconciler = AppointmentReminderReconciler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        appointment_reminder_producer_js_1.AppointmentReminderProducer])
], AppointmentReminderReconciler);
//# sourceMappingURL=appointment-reminder.reconciler.js.map