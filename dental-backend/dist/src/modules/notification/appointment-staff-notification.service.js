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
var AppointmentStaffNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentStaffNotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const notification_service_js_1 = require("./notification.service.js");
const push_notification_service_js_1 = require("./push-notification.service.js");
const index_js_1 = require("../user/dto/index.js");
function formatTime12(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function formatDate(date) {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
    });
}
let AppointmentStaffNotificationService = AppointmentStaffNotificationService_1 = class AppointmentStaffNotificationService {
    prisma;
    notificationService;
    pushNotificationService;
    logger = new common_1.Logger(AppointmentStaffNotificationService_1.name);
    constructor(prisma, notificationService, pushNotificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.pushNotificationService = pushNotificationService;
    }
    async notifyAppointmentConfirmed(clinicId, appointmentId) {
        try {
            const appt = await this.loadAppointment(appointmentId, clinicId);
            if (!appt || appt.status === 'cancelled')
                return;
            const patientName = `${appt.patient.first_name} ${appt.patient.last_name}`.trim();
            const dateStr = formatDate(appt.appointment_date);
            const timeStr = formatTime12(appt.start_time);
            const title = 'Appointment confirmed';
            const body = `${patientName} — ${dateStr} at ${timeStr}`;
            await this.notifyStaffRecipients(appt.clinic_id, appt.dentist_id, {
                type: 'appointment_confirmed',
                title,
                body,
                metadata: { appointment_id: appt.id, patient_id: appt.patient_id },
                dentistBody: `New appointment with ${patientName} on ${dateStr} at ${timeStr}.`,
                adminBody: `Dr. ${appt.dentist.name} — ${patientName} on ${dateStr} at ${timeStr}.`,
            });
        }
        catch (e) {
            this.logger.warn(`Staff appointment confirmed notification failed for ${appointmentId}: ${e.message}`);
        }
    }
    async notifyAppointmentReminder30Min(clinicId, appointmentId) {
        try {
            const appt = await this.loadAppointment(appointmentId, clinicId);
            if (!appt || appt.status === 'cancelled')
                return;
            const patientName = `${appt.patient.first_name} ${appt.patient.last_name}`.trim();
            const timeStr = formatTime12(appt.start_time);
            const title = 'Appointment in 30 minutes';
            const body = `${patientName} at ${timeStr}`;
            await this.notifyStaffRecipients(appt.clinic_id, appt.dentist_id, {
                type: 'appointment_reminder',
                title,
                body,
                metadata: { appointment_id: appt.id, patient_id: appt.patient_id, minutes_before: 30 },
                dentistBody: `Reminder: ${patientName} at ${timeStr} (in 30 min).`,
                adminBody: `Reminder: Dr. ${appt.dentist.name} with ${patientName} at ${timeStr} (in 30 min).`,
            });
        }
        catch (e) {
            this.logger.warn(`Staff 30min reminder failed for ${appointmentId}: ${e.message}`);
        }
    }
    async loadAppointment(appointmentId, clinicId) {
        return this.prisma.appointment.findFirst({
            where: { id: appointmentId, clinic_id: clinicId },
            include: {
                patient: { select: { id: true, first_name: true, last_name: true } },
                dentist: { select: { id: true, name: true } },
            },
        });
    }
    async notifyStaffRecipients(clinicId, dentistId, input) {
        const admins = await this.prisma.user.findMany({
            where: {
                clinic_id: clinicId,
                role: { in: [index_js_1.UserRole.ADMIN, index_js_1.UserRole.SUPER_ADMIN] },
                status: 'active',
            },
            select: { id: true },
        });
        const notifications = [
            {
                clinic_id: clinicId,
                user_id: dentistId,
                type: input.type,
                title: input.title,
                body: input.dentistBody,
                metadata: input.metadata,
            },
        ];
        for (const admin of admins) {
            if (admin.id === dentistId)
                continue;
            notifications.push({
                clinic_id: clinicId,
                user_id: admin.id,
                type: input.type,
                title: input.title,
                body: input.adminBody,
                metadata: input.metadata,
            });
        }
        await this.notificationService.createMany(notifications);
        const pushData = {
            type: input.type,
            appointment_id: String(input.metadata.appointment_id ?? ''),
        };
        if (input.metadata.patient_id) {
            pushData.patient_id = String(input.metadata.patient_id);
        }
        await this.pushNotificationService.sendToUser(dentistId, {
            title: input.title,
            body: input.dentistBody,
            data: pushData,
        });
        const adminIds = admins.filter((a) => a.id !== dentistId).map((a) => a.id);
        if (adminIds.length > 0) {
            await this.pushNotificationService.sendToUsers(adminIds, {
                title: input.title,
                body: input.adminBody,
                data: pushData,
            });
        }
    }
};
exports.AppointmentStaffNotificationService = AppointmentStaffNotificationService;
exports.AppointmentStaffNotificationService = AppointmentStaffNotificationService = AppointmentStaffNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        notification_service_js_1.NotificationService,
        push_notification_service_js_1.PushNotificationService])
], AppointmentStaffNotificationService);
//# sourceMappingURL=appointment-staff-notification.service.js.map