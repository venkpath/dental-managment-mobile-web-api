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
var AutomationCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const automation_service_js_1 = require("./automation.service.js");
const clinic_events_service_js_1 = require("../clinic-events/clinic-events.service.js");
let AutomationCronService = AutomationCronService_1 = class AutomationCronService {
    prisma;
    communicationService;
    automationService;
    clinicEventsService;
    logger = new common_1.Logger(AutomationCronService_1.name);
    constructor(prisma, communicationService, automationService, clinicEventsService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
        this.automationService = automationService;
        this.clinicEventsService = clinicEventsService;
    }
    async refreshFestivalCalendar() {
        const year = new Date().getFullYear();
        this.logger.log(`[New Year] Refreshing system festival dates for ${year}...`);
        try {
            await this.clinicEventsService.refreshSystemFestivalDatesForYear(year);
            this.logger.log(`[New Year] Festival calendar updated for ${year}.`);
        }
        catch (e) {
            this.logger.error(`[New Year] Festival calendar refresh failed: ${e.message}`, e.stack);
        }
    }
    async birthdayGreetings() {
        this.logger.log('Running birthday greeting automation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'birthday_greeting');
                    if (!rule?.is_enabled)
                        continue;
                    const today = new Date();
                    const month = today.getMonth() + 1;
                    const day = today.getDate();
                    const birthdayPatients = await this.prisma.$queryRaw `
            SELECT id, first_name, last_name, phone, email
            FROM patients
            WHERE clinic_id = ${clinic.id}::uuid
              AND EXTRACT(MONTH FROM date_of_birth) = ${month}
              AND EXTRACT(DAY FROM date_of_birth) = ${day}
          `;
                    for (const patient of birthdayPatients) {
                        try {
                            const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: patient.id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.PROMOTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id ? undefined : `Happy Birthday, ${patient.first_name}! Wishing you a wonderful day from ${clinic.name}.`,
                                variables: {
                                    patient_name: `${patient.first_name} ${patient.last_name}`,
                                    patient_first_name: patient.first_name,
                                    clinic_name: clinic.name,
                                    '1': patient.first_name,
                                    '2': clinic.name,
                                },
                                metadata: { automation: 'birthday_greeting' },
                            });
                            totalSent++;
                        }
                        catch (e) {
                            this.logger.warn(`Birthday greeting failed for patient ${patient.id}: ${e.message}`);
                        }
                    }
                    if (birthdayPatients.length > 0) {
                        this.logger.log(`Sent ${birthdayPatients.length} birthday greetings for clinic ${clinic.name}`);
                    }
                }
                catch (e) {
                    this.logger.error(`Birthday greeting error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Birthday greeting cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Birthday greeting automation completed. Total sent: ${totalSent}`);
    }
    async festivalGreetings() {
        this.logger.log('Running festival greeting automation...');
        let totalSent = 0;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const recurringIds = await this.prisma.$queryRaw `
        SELECT id FROM clinic_events
        WHERE is_enabled = true
          AND is_recurring = true
          AND EXTRACT(MONTH FROM event_date) = ${month}
          AND EXTRACT(DAY FROM event_date) = ${day}
      `;
            const events = await this.prisma.clinicEvent.findMany({
                where: {
                    is_enabled: true,
                    OR: [
                        { is_recurring: false, event_date: { gte: today, lt: tomorrow } },
                        { id: { in: recurringIds.map((r) => r.id) } },
                    ],
                },
                include: { template: true },
            });
            if (events.length === 0) {
                this.logger.log('Festival greeting automation completed. No events today.');
                return;
            }
            for (const event of events) {
                try {
                    const clinicIds = event.clinic_id
                        ? [event.clinic_id]
                        : (await this.getActiveClinics()).map((c) => c.id);
                    for (const clinicId of clinicIds) {
                        const rule = await this.automationService.getRuleConfig(clinicId, 'festival_greeting');
                        if (!rule?.is_enabled)
                            continue;
                        const patients = await this.prisma.patient.findMany({
                            where: { clinic_id: clinicId },
                            select: { id: true, first_name: true, last_name: true, phone: true, email: true },
                        });
                        const clinic = await this.prisma.clinic.findUnique({
                            where: { id: clinicId },
                            select: { name: true, phone: true },
                        });
                        for (const patient of patients) {
                            try {
                                const channel = await this.resolveChannel(clinicId, patient.id, rule.channel);
                                const effectiveTemplateId = event.template_id ?? rule.template_id ?? undefined;
                                const tmplName = event.template?.template_name ?? '';
                                const occasionLabel = event.occasion_message ?? '';
                                const clinicName = clinic?.name || '';
                                const patientFirst = patient.first_name;
                                let variables;
                                let fallbackBody;
                                if (occasionLabel && tmplName === 'dental_health_awareness') {
                                    variables = {
                                        patient_first_name: patientFirst,
                                        health_day: occasionLabel,
                                        clinic_name: clinicName,
                                        '1': patientFirst,
                                        '2': occasionLabel,
                                        '3': clinicName,
                                    };
                                    fallbackBody = `Hi ${patientFirst}, on this ${occasionLabel}, ${clinicName} reminds you that your oral health is our priority. Book your dental checkup today!`;
                                }
                                else if (occasionLabel && tmplName === 'dental_national_day_greeting') {
                                    variables = {
                                        patient_first_name: patientFirst,
                                        clinic_name: clinicName,
                                        occasion: occasionLabel,
                                        '1': patientFirst,
                                        '2': clinicName,
                                        '3': occasionLabel,
                                    };
                                    fallbackBody = `Hi ${patientFirst}, the team at ${clinicName} wishes you a very Happy ${occasionLabel}! May this special occasion bring joy and good health to you and your loved ones.`;
                                }
                                else {
                                    variables = {
                                        patient_first_name: patientFirst,
                                        clinic_name: clinicName,
                                        festival_name: event.event_name,
                                        phone: clinic?.phone || '',
                                        '1': patientFirst,
                                        '2': event.event_name,
                                        '3': clinicName,
                                    };
                                    fallbackBody = `Wishing you a Happy ${event.event_name}! From ${clinicName}.`;
                                }
                                await this.communicationService.sendMessage(clinicId, {
                                    patient_id: patient.id,
                                    channel,
                                    category: send_message_dto_js_1.MessageCategory.PROMOTIONAL,
                                    template_id: effectiveTemplateId,
                                    body: effectiveTemplateId ? undefined : fallbackBody,
                                    variables,
                                    metadata: { automation: 'festival_greeting', event_id: event.id },
                                });
                                totalSent++;
                            }
                            catch {
                            }
                        }
                        this.logger.log(`Festival greeting "${event.event_name}" sent to ${patients.length} patients for clinic ${clinicId}`);
                    }
                }
                catch (e) {
                    this.logger.error(`Festival greeting error for event ${event.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Festival greeting cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Festival greeting automation completed. Total sent: ${totalSent}`);
    }
    async appointmentRemindersToPatients() {
        this.logger.log('Running patient appointment reminder automation...');
        let sent = 0;
        let skipped = 0;
        let failed = 0;
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
                include: {
                    patient: true,
                    dentist: { select: { name: true } },
                    clinic: { select: { id: true, name: true, phone: true } },
                    branch: { select: { name: true, address: true } },
                },
            });
            this.logger.log(`Found ${appointments.length} appointments for tomorrow`);
            for (const appt of appointments) {
                try {
                    const rule = await this.automationService.getRuleConfig(appt.clinic_id, 'appointment_reminder_patient');
                    if (!rule?.is_enabled) {
                        skipped++;
                        continue;
                    }
                    const fmtDate = this.formatDate(appt.appointment_date);
                    const fmtTime = this.formatTime(appt.start_time);
                    const clinicPhone = appt.clinic.phone || '';
                    const channel = await this.resolveChannel(appt.clinic_id, appt.patient_id, rule.channel);
                    await this.communicationService.sendMessage(appt.clinic_id, {
                        patient_id: appt.patient_id,
                        channel,
                        category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                        template_id: rule.template_id ?? undefined,
                        body: rule.template_id
                            ? undefined
                            : `Reminder: You have an appointment tomorrow at ${fmtTime} with Dr. ${appt.dentist.name} at ${appt.clinic.name}.`,
                        variables: {
                            patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
                            patient_first_name: appt.patient.first_name,
                            date: fmtDate,
                            time: fmtTime,
                            dentist_name: appt.dentist.name,
                            doctor_name: appt.dentist.name,
                            clinic_name: appt.clinic.name,
                            phone: clinicPhone,
                            '1': appt.patient.first_name,
                            '2': fmtDate,
                            '3': fmtTime,
                            '4': appt.clinic.name,
                            '5': appt.dentist.name,
                            '6': clinicPhone,
                        },
                        metadata: { automation: 'appointment_reminder_patient', appointment_id: appt.id },
                    });
                    sent++;
                }
                catch (e) {
                    failed++;
                    this.logger.warn(`Appointment reminder failed for ${appt.patient_id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Appointment reminder cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Appointment reminder automation completed. Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}`);
    }
    async paymentReminders() {
        this.logger.log('Running payment reminder automation...');
        let sent = 0;
        let failed = 0;
        try {
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
            threeDaysFromNow.setHours(0, 0, 0, 0);
            const nextDay = new Date(threeDaysFromNow);
            nextDay.setDate(nextDay.getDate() + 1);
            const upcomingInstallments = await this.prisma.installmentItem.findMany({
                where: {
                    due_date: { gte: threeDaysFromNow, lt: nextDay },
                    status: 'pending',
                },
                include: {
                    plan: {
                        include: {
                            invoice: {
                                include: {
                                    patient: true,
                                    clinic: { select: { id: true, name: true, phone: true } },
                                },
                            },
                        },
                    },
                },
            });
            this.logger.log(`Found ${upcomingInstallments.length} upcoming installments due in 3 days`);
            for (const item of upcomingInstallments) {
                const invoice = item.plan.invoice;
                try {
                    const rule = await this.automationService.getRuleConfig(invoice.clinic_id, 'payment_reminder');
                    if (!rule?.is_enabled)
                        continue;
                    const fmtAmount = this.formatAmount(item.amount);
                    const fmtDueDate = this.formatDate(item.due_date);
                    const clinicPhone = invoice.clinic.phone || '';
                    const channel = await this.resolveChannel(invoice.clinic_id, invoice.patient_id, rule.channel);
                    await this.communicationService.sendMessage(invoice.clinic_id, {
                        patient_id: invoice.patient_id,
                        channel,
                        category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                        template_id: rule.template_id ?? undefined,
                        body: rule.template_id
                            ? undefined
                            : `Reminder: Your installment of ${fmtAmount} is due on ${fmtDueDate}. Please visit ${invoice.clinic.name} or contact us.`,
                        variables: {
                            patient_name: `${invoice.patient.first_name} ${invoice.patient.last_name}`,
                            patient_first_name: invoice.patient.first_name,
                            amount: fmtAmount,
                            due_date: fmtDueDate,
                            clinic_name: invoice.clinic.name,
                            invoice_number: invoice.invoice_number,
                            phone: clinicPhone,
                            '1': invoice.patient.first_name,
                            '2': fmtAmount,
                            '3': fmtDueDate,
                            '4': invoice.clinic.name,
                            '5': clinicPhone,
                        },
                        metadata: { automation: 'payment_reminder', installment_id: item.id, invoice_id: invoice.id },
                    });
                    sent++;
                }
                catch (e) {
                    failed++;
                    this.logger.warn(`Payment reminder failed: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Payment reminder cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Payment reminder automation completed. Sent: ${sent}, Failed: ${failed}`);
    }
    async dormantPatientDetection() {
        this.logger.log('Running dormant patient detection...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'dormant_reactivation');
                    if (!rule?.is_enabled)
                        continue;
                    const config = rule.config || {};
                    const dormancyMonths = config.dormancy_months || 6;
                    const cutoff = new Date();
                    cutoff.setMonth(cutoff.getMonth() - dormancyMonths);
                    const dormantPatients = await this.prisma.patient.findMany({
                        where: {
                            clinic_id: clinic.id,
                            appointments: { none: { appointment_date: { gte: cutoff } } },
                        },
                        select: { id: true, first_name: true, last_name: true, phone: true, email: true },
                    });
                    for (const patient of dormantPatients) {
                        try {
                            const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: patient.id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.PROMOTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id
                                    ? undefined
                                    : `Hi ${patient.first_name}, it's been a while since your last visit to ${clinic.name}. Your dental health matters! Book your check-up today.`,
                                variables: {
                                    patient_name: `${patient.first_name} ${patient.last_name}`,
                                    patient_first_name: patient.first_name,
                                    clinic_name: clinic.name,
                                    phone: clinic.phone || '',
                                    '1': patient.first_name,
                                    '2': clinic.name,
                                    '3': clinic.phone || '',
                                },
                                metadata: { automation: 'dormant_reactivation' },
                            });
                            totalSent++;
                        }
                        catch {
                        }
                    }
                    if (dormantPatients.length > 0) {
                        this.logger.log(`Sent reactivation messages to ${dormantPatients.length} dormant patients for ${clinic.name}`);
                    }
                }
                catch (e) {
                    this.logger.error(`Dormant detection error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Dormant patient cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Dormant patient detection completed. Total sent: ${totalSent}`);
    }
    async treatmentPlanReminders() {
        this.logger.log('Running treatment plan reminder automation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'treatment_plan_reminder');
                    if (!rule?.is_enabled)
                        continue;
                    const config = rule.config || {};
                    const intervalDays = config.reminder_interval_days || 14;
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - intervalDays);
                    const patients = await this.prisma.patient.findMany({
                        where: {
                            clinic_id: clinic.id,
                            treatments: {
                                some: { status: { in: ['planned', 'in_progress'] } },
                            },
                            appointments: {
                                none: { appointment_date: { gte: cutoff } },
                            },
                        },
                        select: { id: true, first_name: true, last_name: true, phone: true, email: true },
                    });
                    for (const patient of patients) {
                        try {
                            const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: patient.id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id
                                    ? undefined
                                    : `Hi ${patient.first_name}, you have an incomplete treatment plan at ${clinic.name}. Please book your next visit to continue your care.`,
                                variables: {
                                    patient_name: `${patient.first_name} ${patient.last_name}`,
                                    patient_first_name: patient.first_name,
                                    clinic_name: clinic.name,
                                    '1': patient.first_name,
                                    '2': clinic.name,
                                },
                                metadata: { automation: 'treatment_plan_reminder' },
                            });
                            totalSent++;
                        }
                        catch {
                        }
                    }
                }
                catch (e) {
                    this.logger.error(`Treatment plan reminder error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Treatment plan reminder cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Treatment plan reminder automation completed. Total sent: ${totalSent}`);
    }
    async noShowFollowUp() {
        this.logger.log('Running no-show follow-up automation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'no_show_followup');
                    if (!rule?.is_enabled)
                        continue;
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const noShowAppts = await this.prisma.appointment.findMany({
                        where: {
                            clinic_id: clinic.id,
                            status: 'no_show',
                            appointment_date: { gte: yesterday, lt: today },
                        },
                        include: {
                            patient: true,
                            dentist: { select: { name: true } },
                        },
                    });
                    for (const appt of noShowAppts) {
                        try {
                            const channel = await this.resolveChannel(clinic.id, appt.patient_id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: appt.patient_id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id
                                    ? undefined
                                    : `Hi ${appt.patient.first_name}, we missed you at your appointment yesterday at ${clinic.name}. Please call us to reschedule at your convenience.`,
                                variables: {
                                    patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
                                    patient_first_name: appt.patient.first_name,
                                    clinic_name: clinic.name,
                                    phone: clinic.phone || '',
                                    '1': appt.patient.first_name,
                                    '2': clinic.name,
                                    '3': clinic.phone || '',
                                },
                                metadata: { automation: 'no_show_followup', appointment_id: appt.id },
                            });
                            totalSent++;
                        }
                        catch {
                        }
                    }
                }
                catch (e) {
                    this.logger.error(`No-show follow-up error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`No-show follow-up cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`No-show follow-up automation completed. Total sent: ${totalSent}`);
    }
    async postTreatmentCare() {
        this.logger.log('Running post-treatment care automation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'post_treatment_care');
                    if (!rule?.is_enabled)
                        continue;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const completedTreatments = await this.prisma.treatment.findMany({
                        where: {
                            clinic_id: clinic.id,
                            status: 'completed',
                            updated_at: { gte: today, lt: tomorrow },
                        },
                        include: {
                            patient: true,
                            dentist: { select: { name: true } },
                        },
                    });
                    for (const treatment of completedTreatments) {
                        try {
                            const channel = await this.resolveChannel(clinic.id, treatment.patient_id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: treatment.patient_id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id
                                    ? undefined
                                    : `Hi ${treatment.patient.first_name}, thank you for visiting ${clinic.name} today for your ${treatment.procedure}. Please follow your dentist's care instructions. Contact us if you have any concerns.`,
                                variables: {
                                    patient_name: `${treatment.patient.first_name} ${treatment.patient.last_name}`,
                                    patient_first_name: treatment.patient.first_name,
                                    procedure: treatment.procedure,
                                    dentist_name: treatment.dentist.name,
                                    doctor_name: treatment.dentist.name,
                                    clinic_name: clinic.name,
                                    phone: clinic.phone || '',
                                    '1': treatment.patient.first_name,
                                    '2': treatment.procedure,
                                    '3': clinic.name,
                                    '4': treatment.dentist.name,
                                    '5': clinic.phone || '',
                                },
                                metadata: { automation: 'post_treatment_care', treatment_id: treatment.id },
                            });
                            totalSent++;
                        }
                        catch {
                        }
                    }
                }
                catch (e) {
                    this.logger.error(`Post-treatment care error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Post-treatment care cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Post-treatment care automation completed. Total sent: ${totalSent}`);
    }
    async feedbackCollection() {
        this.logger.log('Running feedback collection automation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'feedback_collection');
                    if (!rule?.is_enabled)
                        continue;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const completedAppts = await this.prisma.appointment.findMany({
                        where: {
                            clinic_id: clinic.id,
                            status: 'completed',
                            appointment_date: { gte: yesterday, lt: today },
                        },
                        include: { patient: true },
                    });
                    for (const appt of completedAppts) {
                        try {
                            const existingFeedback = await this.prisma.patientFeedback.findFirst({
                                where: { appointment_id: appt.id },
                            });
                            if (existingFeedback)
                                continue;
                            const channel = await this.resolveChannel(clinic.id, appt.patient_id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: appt.patient_id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id
                                    ? undefined
                                    : `Hi ${appt.patient.first_name}, thank you for visiting ${clinic.name}! We'd love your feedback on your recent visit. Please rate your experience — it helps us serve you better.`,
                                variables: {
                                    patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
                                    patient_first_name: appt.patient.first_name,
                                    clinic_name: clinic.name,
                                    '1': appt.patient.first_name,
                                    '2': clinic.name,
                                },
                                metadata: { automation: 'feedback_collection', appointment_id: appt.id },
                            });
                            totalSent++;
                        }
                        catch {
                        }
                    }
                }
                catch (e) {
                    this.logger.error(`Feedback collection error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Feedback collection cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Feedback collection automation completed. Total sent: ${totalSent}`);
    }
    async overduePaymentNotification() {
        this.logger.log('Running overdue payment notification to patients...');
        let totalSent = 0;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdueInstallments = await this.prisma.installmentItem.findMany({
                where: {
                    due_date: { lt: today },
                    status: 'pending',
                },
                include: {
                    plan: {
                        include: {
                            invoice: {
                                include: {
                                    patient: true,
                                    clinic: { select: { id: true, name: true, phone: true, subscription_status: true } },
                                },
                            },
                        },
                    },
                },
            });
            for (const item of overdueInstallments) {
                const invoice = item.plan.invoice;
                if (!['active', 'trial'].includes(invoice.clinic.subscription_status))
                    continue;
                try {
                    const rule = await this.automationService.getRuleConfig(invoice.clinic_id, 'payment_overdue');
                    if (!rule?.is_enabled)
                        continue;
                    const fmtAmountOverdue = this.formatAmount(item.amount);
                    const fmtDueDateOverdue = this.formatDate(item.due_date);
                    const overdueClinicPhone = invoice.clinic.phone || '';
                    const channel = await this.resolveChannel(invoice.clinic_id, invoice.patient_id, rule.channel);
                    await this.communicationService.sendMessage(invoice.clinic_id, {
                        patient_id: invoice.patient_id,
                        channel,
                        category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                        template_id: rule.template_id ?? undefined,
                        body: rule.template_id
                            ? undefined
                            : `Hi ${invoice.patient.first_name}, your payment of ${fmtAmountOverdue} for invoice ${invoice.invoice_number} was due on ${fmtDueDateOverdue}. Please make the payment at your earliest convenience. Contact ${invoice.clinic.name} at ${overdueClinicPhone} for any queries.`,
                        variables: {
                            patient_name: `${invoice.patient.first_name} ${invoice.patient.last_name}`,
                            patient_first_name: invoice.patient.first_name,
                            amount: fmtAmountOverdue,
                            due_date: fmtDueDateOverdue,
                            clinic_name: invoice.clinic.name,
                            invoice_number: invoice.invoice_number,
                            phone: overdueClinicPhone,
                            '1': invoice.patient.first_name,
                            '2': fmtAmountOverdue,
                            '3': fmtDueDateOverdue,
                            '4': invoice.clinic.name,
                            '5': overdueClinicPhone,
                        },
                        metadata: { automation: 'payment_overdue', installment_id: item.id, invoice_id: invoice.id },
                    });
                    totalSent++;
                }
                catch (e) {
                    this.logger.warn(`Overdue payment notification failed: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Overdue payment notification cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Overdue payment notification completed. Total sent: ${totalSent}`);
    }
    async googleReviewSolicitation() {
        this.logger.log('Running Google review solicitation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'feedback_collection');
                    if (!rule?.is_enabled)
                        continue;
                    const config = rule.config || {};
                    const minRating = config.min_rating_for_google_review || 4;
                    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
                        where: { clinic_id: clinic.id },
                    });
                    if (!settings?.google_review_url)
                        continue;
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const positiveFeedback = await this.prisma.patientFeedback.findMany({
                        where: {
                            clinic_id: clinic.id,
                            rating: { gte: minRating },
                            google_review_requested: false,
                            created_at: { gte: yesterday, lt: today },
                        },
                        include: { patient: true },
                    });
                    for (const feedback of positiveFeedback) {
                        try {
                            const channel = await this.resolveChannel(clinic.id, feedback.patient_id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: feedback.patient_id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.PROMOTIONAL,
                                body: `Hi ${feedback.patient.first_name}, thank you for the wonderful feedback! We'd appreciate it if you could share your experience on Google: ${settings.google_review_url}`,
                                variables: {
                                    patient_name: `${feedback.patient.first_name} ${feedback.patient.last_name}`,
                                    patient_first_name: feedback.patient.first_name,
                                    clinic_name: clinic.name,
                                    google_review_url: settings.google_review_url,
                                },
                                metadata: { automation: 'google_review_solicitation', feedback_id: feedback.id },
                            });
                            await this.prisma.patientFeedback.update({
                                where: { id: feedback.id },
                                data: { google_review_requested: true },
                            });
                            totalSent++;
                        }
                        catch {
                        }
                    }
                }
                catch (e) {
                    this.logger.error(`Google review solicitation error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Google review solicitation cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Google review solicitation completed. Total sent: ${totalSent}`);
    }
    async patientAnniversaryGreeting() {
        this.logger.log('Running patient anniversary greeting automation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'anniversary_greeting');
                    if (!rule?.is_enabled)
                        continue;
                    const today = new Date();
                    const month = today.getMonth() + 1;
                    const day = today.getDate();
                    const anniversaryPatients = await this.prisma.$queryRaw `
            SELECT id, first_name, last_name, phone, email,
              EXTRACT(YEAR FROM AGE(NOW(), created_at))::int AS years
            FROM patients
            WHERE clinic_id = ${clinic.id}::uuid
              AND EXTRACT(MONTH FROM created_at) = ${month}
              AND EXTRACT(DAY FROM created_at) = ${day}
              AND created_at < NOW() - INTERVAL '1 year'
          `;
                    for (const patient of anniversaryPatients) {
                        try {
                            const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: patient.id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.PROMOTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id
                                    ? undefined
                                    : `Happy ${patient.years}-year anniversary with ${clinic.name}, ${patient.first_name}! 🎉 Thank you for trusting us with your dental care. We look forward to many more years of keeping your smile bright!`,
                                variables: {
                                    patient_name: `${patient.first_name} ${patient.last_name}`,
                                    patient_first_name: patient.first_name,
                                    clinic_name: clinic.name,
                                    anniversary_years: String(patient.years),
                                },
                                metadata: { automation: 'anniversary_greeting' },
                            });
                            totalSent++;
                        }
                        catch (e) {
                            this.logger.warn(`Anniversary greeting failed for patient ${patient.id}: ${e.message}`);
                        }
                    }
                    if (anniversaryPatients.length > 0) {
                        this.logger.log(`Sent ${anniversaryPatients.length} anniversary greetings for clinic ${clinic.name}`);
                    }
                }
                catch (e) {
                    this.logger.error(`Anniversary greeting error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Anniversary greeting cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Patient anniversary greeting automation completed. Total sent: ${totalSent}`);
    }
    async prescriptionRefillReminder() {
        this.logger.log('Running prescription refill reminder automation...');
        let totalSent = 0;
        try {
            const clinics = await this.getActiveClinics();
            for (const clinic of clinics) {
                try {
                    const rule = await this.automationService.getRuleConfig(clinic.id, 'prescription_refill');
                    if (!rule?.is_enabled)
                        continue;
                    const config = rule.config || {};
                    const advanceDays = config.advance_days || 2;
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() + advanceDays);
                    targetDate.setHours(0, 0, 0, 0);
                    const targetDateEnd = new Date(targetDate);
                    targetDateEnd.setDate(targetDateEnd.getDate() + 1);
                    const prescriptions = await this.prisma.prescription.findMany({
                        where: { clinic_id: clinic.id },
                        include: {
                            patient: { select: { id: true, first_name: true, last_name: true, phone: true, email: true } },
                            items: true,
                        },
                        orderBy: { created_at: 'desc' },
                    });
                    for (const rx of prescriptions) {
                        const createdAt = new Date(rx.created_at);
                        const daysSinceCreation = Math.floor((targetDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysSinceCreation > 90 || daysSinceCreation < 0)
                            continue;
                        const expiringItems = rx.items.filter((item) => {
                            const durationDays = this.parseDurationToDays(item.duration);
                            if (!durationDays)
                                return false;
                            const endDay = durationDays;
                            return daysSinceCreation >= endDay - advanceDays && daysSinceCreation <= endDay;
                        });
                        if (expiringItems.length === 0)
                            continue;
                        const medicineNames = expiringItems.map((i) => i.medicine_name).join(', ');
                        try {
                            const channel = await this.resolveChannel(clinic.id, rx.patient.id, rule.channel);
                            await this.communicationService.sendMessage(clinic.id, {
                                patient_id: rx.patient.id,
                                channel,
                                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                                template_id: rule.template_id ?? undefined,
                                body: rule.template_id
                                    ? undefined
                                    : `Hi ${rx.patient.first_name}, your prescription for ${medicineNames} is about to run out. Please contact ${clinic.name} if you need a refill or follow-up appointment.`,
                                variables: {
                                    patient_name: `${rx.patient.first_name} ${rx.patient.last_name}`,
                                    patient_first_name: rx.patient.first_name,
                                    clinic_name: clinic.name,
                                    medicine_names: medicineNames,
                                },
                                metadata: { automation: 'prescription_refill', prescription_id: rx.id },
                            });
                            totalSent++;
                        }
                        catch (e) {
                            this.logger.warn(`Prescription refill reminder failed for patient ${rx.patient.id}: ${e.message}`);
                        }
                    }
                }
                catch (e) {
                    this.logger.error(`Prescription refill error for clinic ${clinic.id}: ${e.message}`);
                }
            }
        }
        catch (e) {
            this.logger.error(`Prescription refill cron failed: ${e.message}`, e.stack);
        }
        this.logger.log(`Prescription refill reminder automation completed. Total sent: ${totalSent}`);
    }
    async getActiveClinics() {
        return this.prisma.clinic.findMany({
            where: { subscription_status: { in: ['active', 'trial'] } },
            select: { id: true, name: true, phone: true },
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
    formatAmount(amount) {
        const num = typeof amount === 'number' ? amount : Number(amount);
        return `Rs.${num.toLocaleString('en-IN')}`;
    }
    async resolveChannel(clinicId, patientId, ruleChannel) {
        if (ruleChannel !== 'preferred') {
            return this.toMessageChannel(ruleChannel);
        }
        const prefs = await this.prisma.patientCommunicationPreference.findUnique({
            where: { patient_id: patientId },
            select: { preferred_channel: true },
        });
        const settings = await this.prisma.clinicCommunicationSettings.findUnique({
            where: { clinic_id: clinicId },
        });
        const preferred = prefs?.preferred_channel || 'whatsapp';
        if (settings) {
            if (preferred === 'whatsapp' && settings.enable_whatsapp)
                return send_message_dto_js_1.MessageChannel.WHATSAPP;
            if (preferred === 'sms' && settings.enable_sms)
                return send_message_dto_js_1.MessageChannel.SMS;
            if (preferred === 'email' && settings.enable_email)
                return send_message_dto_js_1.MessageChannel.EMAIL;
            if (settings.enable_whatsapp)
                return send_message_dto_js_1.MessageChannel.WHATSAPP;
            if (settings.enable_sms)
                return send_message_dto_js_1.MessageChannel.SMS;
            if (settings.enable_email)
                return send_message_dto_js_1.MessageChannel.EMAIL;
        }
        return this.toMessageChannel(preferred);
    }
    toMessageChannel(value) {
        const map = {
            email: send_message_dto_js_1.MessageChannel.EMAIL,
            sms: send_message_dto_js_1.MessageChannel.SMS,
            whatsapp: send_message_dto_js_1.MessageChannel.WHATSAPP,
        };
        return map[value] || send_message_dto_js_1.MessageChannel.WHATSAPP;
    }
    parseDurationToDays(duration) {
        const match = duration.toLowerCase().match(/^(\d+)\s*(day|days|week|weeks|month|months)$/);
        if (!match)
            return null;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        if (unit.startsWith('day'))
            return value;
        if (unit.startsWith('week'))
            return value * 7;
        if (unit.startsWith('month'))
            return value * 30;
        return null;
    }
};
exports.AutomationCronService = AutomationCronService;
__decorate([
    (0, schedule_1.Cron)('0 0 1 1 1 *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "refreshFestivalCalendar", null);
__decorate([
    (0, schedule_1.Cron)('0 30 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "birthdayGreetings", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_8AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "festivalGreetings", null);
__decorate([
    (0, schedule_1.Cron)('0 30 7 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "appointmentRemindersToPatients", null);
__decorate([
    (0, schedule_1.Cron)('0 30 9 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "paymentReminders", null);
__decorate([
    (0, schedule_1.Cron)('0 0 6 * * 1'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "dormantPatientDetection", null);
__decorate([
    (0, schedule_1.Cron)('0 0 10 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "treatmentPlanReminders", null);
__decorate([
    (0, schedule_1.Cron)('0 30 10 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "noShowFollowUp", null);
__decorate([
    (0, schedule_1.Cron)('0 0 18 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "postTreatmentCare", null);
__decorate([
    (0, schedule_1.Cron)('0 0 19 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "feedbackCollection", null);
__decorate([
    (0, schedule_1.Cron)('0 0 11 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "overduePaymentNotification", null);
__decorate([
    (0, schedule_1.Cron)('0 0 20 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "googleReviewSolicitation", null);
__decorate([
    (0, schedule_1.Cron)('0 0 9 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "patientAnniversaryGreeting", null);
__decorate([
    (0, schedule_1.Cron)('0 0 8 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationCronService.prototype, "prescriptionRefillReminder", null);
exports.AutomationCronService = AutomationCronService = AutomationCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService,
        clinic_events_service_js_1.ClinicEventsService])
], AutomationCronService);
//# sourceMappingURL=automation.cron.js.map