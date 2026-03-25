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
var NotificationCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const notification_service_js_1 = require("./notification.service.js");
let NotificationCronService = NotificationCronService_1 = class NotificationCronService {
    prisma;
    notificationService;
    logger = new common_1.Logger(NotificationCronService_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async appointmentReminders() {
        this.logger.log('Running appointment reminder cron...');
        let created = 0;
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const dayAfter = new Date(tomorrow);
            dayAfter.setDate(dayAfter.getDate() + 1);
            const appointments = await this.prisma.appointment.findMany({
                where: {
                    appointment_date: { gte: tomorrow, lt: dayAfter },
                    status: 'scheduled',
                },
                include: { patient: true, dentist: true },
            });
            this.logger.log(`Found ${appointments.length} appointments for tomorrow`);
            if (appointments.length === 0) {
                this.logger.log('Appointment reminder cron completed. No appointments for tomorrow.');
                return;
            }
            const notifications = [];
            for (const appt of appointments) {
                notifications.push({
                    clinic_id: appt.clinic_id,
                    user_id: appt.dentist_id,
                    type: 'appointment_reminder',
                    title: 'Appointment Tomorrow',
                    body: `You have an appointment with ${appt.patient.first_name} ${appt.patient.last_name} at ${appt.start_time}.`,
                    metadata: { appointment_id: appt.id, patient_id: appt.patient_id },
                });
                const admins = await this.prisma.user.findMany({
                    where: { clinic_id: appt.clinic_id, role: 'Admin', status: 'active' },
                    select: { id: true },
                });
                for (const admin of admins) {
                    if (admin.id === appt.dentist_id)
                        continue;
                    notifications.push({
                        clinic_id: appt.clinic_id,
                        user_id: admin.id,
                        type: 'appointment_reminder',
                        title: 'Appointment Tomorrow',
                        body: `Dr. ${appt.dentist.name} has an appointment with ${appt.patient.first_name} ${appt.patient.last_name} at ${appt.start_time}.`,
                        metadata: { appointment_id: appt.id, patient_id: appt.patient_id },
                    });
                }
            }
            if (notifications.length > 0) {
                created = await this.notificationService.createMany(notifications);
                this.logger.log(`Created ${created} appointment reminder notifications`);
            }
        }
        catch (e) {
            this.logger.error(`Appointment reminder cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Appointment reminder cron completed. Created: ${created}`);
    }
    async paymentOverdueAlerts() {
        this.logger.log('Running payment overdue cron...');
        let created = 0;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdueItems = await this.prisma.installmentItem.findMany({
                where: {
                    due_date: { lt: today },
                    status: 'pending',
                },
                include: {
                    plan: {
                        include: {
                            invoice: {
                                include: { patient: true },
                            },
                        },
                    },
                },
            });
            this.logger.log(`Found ${overdueItems.length} overdue installment items`);
            if (overdueItems.length === 0) {
                this.logger.log('Payment overdue cron completed. No overdue items.');
                return;
            }
            const byClinic = new Map();
            for (const item of overdueItems) {
                const clinicId = item.plan.invoice.clinic_id;
                if (!byClinic.has(clinicId))
                    byClinic.set(clinicId, []);
                byClinic.get(clinicId).push(item);
            }
            const notifications = [];
            for (const [clinicId, items] of byClinic) {
                const admins = await this.prisma.user.findMany({
                    where: { clinic_id: clinicId, role: 'Admin', status: 'active' },
                    select: { id: true },
                });
                for (const admin of admins) {
                    notifications.push({
                        clinic_id: clinicId,
                        user_id: admin.id,
                        type: 'payment_overdue',
                        title: `${items.length} Overdue Installment(s)`,
                        body: `There are ${items.length} overdue installment payments requiring attention.`,
                        metadata: { installment_ids: items.map((i) => i.id) },
                    });
                }
                await this.prisma.installmentItem.updateMany({
                    where: { id: { in: items.map((i) => i.id) } },
                    data: { status: 'overdue' },
                });
            }
            if (notifications.length > 0) {
                created = await this.notificationService.createMany(notifications);
                this.logger.log(`Created ${created} overdue payment alerts`);
            }
        }
        catch (e) {
            this.logger.error(`Payment overdue cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Payment overdue cron completed. Created: ${created}`);
    }
    async lowInventoryAlerts() {
        this.logger.log('Running low inventory cron...');
        let created = 0;
        try {
            const lowItems = await this.prisma.$queryRaw `
        SELECT id, clinic_id, branch_id, name, quantity, reorder_level
        FROM inventory_items
        WHERE reorder_level > 0 AND quantity <= reorder_level
      `;
            this.logger.log(`Found ${lowItems.length} low inventory items`);
            if (lowItems.length === 0) {
                this.logger.log('Low inventory cron completed. No low stock items.');
                return;
            }
            const byClinic = new Map();
            for (const item of lowItems) {
                if (!byClinic.has(item.clinic_id))
                    byClinic.set(item.clinic_id, []);
                byClinic.get(item.clinic_id).push(item);
            }
            const notifications = [];
            for (const [clinicId, items] of byClinic) {
                const admins = await this.prisma.user.findMany({
                    where: { clinic_id: clinicId, role: 'Admin', status: 'active' },
                    select: { id: true },
                });
                const itemNames = items.slice(0, 3).map((i) => i.name).join(', ');
                const suffix = items.length > 3 ? ` and ${items.length - 3} more` : '';
                for (const admin of admins) {
                    notifications.push({
                        clinic_id: clinicId,
                        user_id: admin.id,
                        type: 'low_inventory',
                        title: 'Low Inventory Alert',
                        body: `${items.length} item(s) below reorder level: ${itemNames}${suffix}.`,
                        metadata: { item_ids: items.map((i) => i.id) },
                    });
                }
            }
            if (notifications.length > 0) {
                created = await this.notificationService.createMany(notifications);
                this.logger.log(`Created ${created} low inventory alerts`);
            }
        }
        catch (e) {
            this.logger.error(`Low inventory cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Low inventory cron completed. Created: ${created}`);
    }
};
exports.NotificationCronService = NotificationCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationCronService.prototype, "appointmentReminders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationCronService.prototype, "paymentOverdueAlerts", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_7AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationCronService.prototype, "lowInventoryAlerts", null);
exports.NotificationCronService = NotificationCronService = NotificationCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        notification_service_js_1.NotificationService])
], NotificationCronService);
//# sourceMappingURL=notification.cron.js.map