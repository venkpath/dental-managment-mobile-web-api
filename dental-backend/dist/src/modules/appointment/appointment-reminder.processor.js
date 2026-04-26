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
var AppointmentReminderProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentReminderProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
const appointment_reminder_config_js_1 = require("./appointment-reminder.config.js");
function formatDate(date) {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
    });
}
function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function resolveChannel(ruleChannel, preferred, settings) {
    const toChannel = (v) => {
        if (v === 'email')
            return send_message_dto_js_1.MessageChannel.EMAIL;
        if (v === 'sms')
            return send_message_dto_js_1.MessageChannel.SMS;
        return send_message_dto_js_1.MessageChannel.WHATSAPP;
    };
    if (ruleChannel !== 'preferred')
        return toChannel(ruleChannel);
    const pref = preferred ?? 'whatsapp';
    if (settings) {
        if (pref === 'whatsapp' && settings.enable_whatsapp)
            return send_message_dto_js_1.MessageChannel.WHATSAPP;
        if (pref === 'sms' && settings.enable_sms)
            return send_message_dto_js_1.MessageChannel.SMS;
        if (pref === 'email' && settings.enable_email)
            return send_message_dto_js_1.MessageChannel.EMAIL;
        if (settings.enable_whatsapp)
            return send_message_dto_js_1.MessageChannel.WHATSAPP;
        if (settings.enable_sms)
            return send_message_dto_js_1.MessageChannel.SMS;
        if (settings.enable_email)
            return send_message_dto_js_1.MessageChannel.EMAIL;
    }
    return toChannel(pref);
}
let AppointmentReminderProcessor = AppointmentReminderProcessor_1 = class AppointmentReminderProcessor extends bullmq_1.WorkerHost {
    prisma;
    communicationService;
    logger = new common_1.Logger(AppointmentReminderProcessor_1.name);
    constructor(prisma, communicationService) {
        super();
        this.prisma = prisma;
        this.communicationService = communicationService;
    }
    async process(job) {
        const { appointmentId, clinicId, reminderIndex, reminderHours } = job.data;
        this.logger.log(`Processing reminder ${reminderIndex} (${reminderHours}h before) for appointment ${appointmentId}`);
        const appt = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: true,
                dentist: { select: { name: true } },
                clinic: { select: { id: true, name: true, phone: true } },
                branch: { select: { name: true } },
            },
        });
        if (!appt) {
            this.logger.warn(`Appointment ${appointmentId} not found — skipping reminder`);
            return;
        }
        if (appt.status !== 'scheduled') {
            this.logger.log(`Appointment ${appointmentId} has status "${appt.status}" — skipping reminder`);
            return;
        }
        const rule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
        });
        if (!rule?.is_enabled) {
            this.logger.log(`appointment_reminder_patient rule disabled for clinic ${clinicId} — skipping`);
            return;
        }
        const config = rule.config ?? {};
        const templateKey = `reminder_${reminderIndex}_template_id`;
        if (!(0, appointment_reminder_config_js_1.isReminderEnabled)(config, reminderIndex, true)) {
            this.logger.log(`Reminder ${reminderIndex} disabled for clinic ${clinicId} — skipping`);
            return;
        }
        const templateId = config[templateKey] ?? rule.template_id ?? undefined;
        const [prefs, settings] = await Promise.all([
            this.prisma.patientCommunicationPreference.findUnique({
                where: { patient_id: appt.patient_id },
                select: { preferred_channel: true },
            }),
            this.prisma.clinicCommunicationSettings.findUnique({
                where: { clinic_id: clinicId },
            }),
        ]);
        const channel = resolveChannel(rule.channel, prefs?.preferred_channel, settings);
        const fmtDate = formatDate(appt.appointment_date);
        const fmtTime = formatTime(appt.start_time);
        const clinicPhone = appt.clinic.phone ?? '';
        const timeUntilPhrase = reminderHours >= 24
            ? 'tomorrow'
            : reminderHours >= 1
                ? `in ${reminderHours} hour${reminderHours === 1 ? '' : 's'}`
                : `in ${Math.round(reminderHours * 60)} minutes`;
        const isSameDay = reminderHours < 12;
        const dateForTemplate = isSameDay ? 'Today' : fmtDate;
        const timeForTemplate = isSameDay ? `${fmtTime} (${timeUntilPhrase})` : fmtTime;
        await this.communicationService.sendMessage(clinicId, {
            patient_id: appt.patient_id,
            channel,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: templateId,
            body: templateId
                ? undefined
                : `Reminder: You have an appointment ${timeUntilPhrase} at ${fmtTime} with Dr. ${appt.dentist.name} at ${appt.clinic.name}.`,
            variables: {
                patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
                patient_first_name: appt.patient.first_name,
                appointment_date: fmtDate,
                date: fmtDate,
                appointment_time: fmtTime,
                time: fmtTime,
                dentist_name: appt.dentist.name,
                doctor_name: appt.dentist.name,
                clinic_name: appt.clinic.name,
                clinic_phone: clinicPhone,
                phone: clinicPhone,
                time_until: timeUntilPhrase,
                '1': appt.patient.first_name,
                '2': dateForTemplate,
                '3': timeForTemplate,
                '4': appt.clinic.name,
                '5': appt.dentist.name,
                '6': clinicPhone,
            },
            metadata: {
                automation: 'appointment_reminder_patient',
                appointment_id: appt.id,
                reminder_index: reminderIndex,
                reminder_hours: reminderHours,
            },
        });
        this.logger.log(`Sent reminder ${reminderIndex} for appointment ${appointmentId} via ${channel}`);
    }
};
exports.AppointmentReminderProcessor = AppointmentReminderProcessor;
exports.AppointmentReminderProcessor = AppointmentReminderProcessor = AppointmentReminderProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_js_1.QUEUE_NAMES.APPOINTMENT_REMINDER),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService])
], AppointmentReminderProcessor);
//# sourceMappingURL=appointment-reminder.processor.js.map