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
var AppointmentNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentNotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const WHATSAPP_TEMPLATE_VARS = {
    dental_appointment_confirmation: ['patient_name', 'doctor_name', 'date', 'time', 'clinic_name', 'phone'],
    dental_appointment_reminder: ['patient_name', 'date', 'time', 'clinic_name', 'doctor_name', 'phone'],
    dental_appointment_cancel: ['patient_name', 'clinic_name', 'date', 'time', 'phone'],
    dental_appointment_rescheduled: ['patient_name', 'previous_time', 'new_time', 'clinic_name', 'phone'],
    dental_treatment_followup: ['patient_name', 'treatment', 'clinic_name', 'phone'],
};
let AppointmentNotificationService = AppointmentNotificationService_1 = class AppointmentNotificationService {
    prisma;
    communicationService;
    logger = new common_1.Logger(AppointmentNotificationService_1.name);
    constructor(prisma, communicationService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
    }
    async sendConfirmation(clinicId, appointmentId) {
        try {
            const appt = await this.loadAppointment(appointmentId);
            if (!appt)
                return;
            const templateName = 'dental_appointment_confirmation';
            const variables = this.buildVariables(templateName, appt);
            await this.sendWhatsAppTemplate(clinicId, appt.patient_id, templateName, variables, {
                automation: 'appointment_confirmation',
                appointment_id: appointmentId,
            });
            this.logger.log(`Appointment confirmation sent for ${appointmentId}`);
        }
        catch (e) {
            this.logger.warn(`Failed to send appointment confirmation for ${appointmentId}: ${e.message}`);
        }
    }
    async sendCancellation(clinicId, appointmentId) {
        try {
            const appt = await this.loadAppointment(appointmentId);
            if (!appt)
                return;
            const templateName = 'dental_appointment_cancel';
            const variables = this.buildVariables(templateName, appt);
            await this.sendWhatsAppTemplate(clinicId, appt.patient_id, templateName, variables, {
                automation: 'appointment_cancellation',
                appointment_id: appointmentId,
            });
            this.logger.log(`Appointment cancellation sent for ${appointmentId}`);
        }
        catch (e) {
            this.logger.warn(`Failed to send appointment cancellation for ${appointmentId}: ${e.message}`);
        }
    }
    async sendReschedule(clinicId, appointmentId, oldDate, oldTime) {
        try {
            const appt = await this.loadAppointment(appointmentId);
            if (!appt)
                return;
            const templateName = 'dental_appointment_rescheduled';
            const variables = this.buildVariables(templateName, appt, { oldDate, oldTime });
            await this.sendWhatsAppTemplate(clinicId, appt.patient_id, templateName, variables, {
                automation: 'appointment_rescheduled',
                appointment_id: appointmentId,
            });
            this.logger.log(`Appointment reschedule notification sent for ${appointmentId}`);
        }
        catch (e) {
            this.logger.warn(`Failed to send appointment reschedule for ${appointmentId}: ${e.message}`);
        }
    }
    async loadAppointment(appointmentId) {
        const appt = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: true,
                dentist: { select: { name: true } },
                branch: { select: { name: true, address: true } },
                clinic: { select: { id: true, name: true, phone: true } },
            },
        });
        if (!appt) {
            this.logger.warn(`Appointment ${appointmentId} not found for notification`);
            return null;
        }
        return appt;
    }
    buildVariables(templateName, appt, extra) {
        const varOrder = WHATSAPP_TEMPLATE_VARS[templateName];
        if (!varOrder)
            return {};
        const patientName = `${appt.patient.first_name} ${appt.patient.last_name}`;
        const date = this.formatDate(appt.appointment_date);
        const time = this.formatTime(appt.start_time);
        const clinicName = appt.clinic.name;
        const doctorName = appt.dentist.name;
        const phone = appt.clinic.phone || '';
        const previousTime = extra?.oldDate && extra?.oldTime
            ? `${extra.oldDate} ${this.formatTime(extra.oldTime)}`
            : '';
        const newTime = `${date} ${time}`;
        const valueMap = {
            patient_name: patientName,
            doctor_name: doctorName,
            date,
            time,
            clinic_name: clinicName,
            phone,
            previous_time: previousTime,
            new_time: newTime,
            treatment: '',
        };
        const result = {};
        varOrder.forEach((varName, index) => {
            result[String(index + 1)] = valueMap[varName] || '';
        });
        return result;
    }
    async sendWhatsAppTemplate(clinicId, patientId, templateName, variables, metadata) {
        const template = await this.prisma.messageTemplate.findFirst({
            where: {
                template_name: templateName,
                channel: 'whatsapp',
                is_active: true,
                OR: [{ clinic_id: clinicId }, { clinic_id: null }],
            },
            orderBy: { clinic_id: 'desc' },
        });
        if (!template) {
            this.logger.warn(`WhatsApp template "${templateName}" not found or not active — skipping notification`);
            return;
        }
        await this.communicationService.sendMessage(clinicId, {
            patient_id: patientId,
            channel: send_message_dto_js_1.MessageChannel.WHATSAPP,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: template.id,
            variables,
            metadata,
        });
    }
    formatDate(date) {
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Kolkata',
        });
    }
    formatTime(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const h = hours % 12 || 12;
        return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
    }
};
exports.AppointmentNotificationService = AppointmentNotificationService;
exports.AppointmentNotificationService = AppointmentNotificationService = AppointmentNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService])
], AppointmentNotificationService);
//# sourceMappingURL=appointment-notification.service.js.map