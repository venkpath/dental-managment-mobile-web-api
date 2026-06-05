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
var UntreatedConditionReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UntreatedConditionReminderService = void 0;
exports.parseToothFdiNumbers = parseToothFdiNumbers;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const ai_service_js_1 = require("../ai/ai.service.js");
const automation_service_js_1 = require("./automation.service.js");
const untreated_condition_reminder_config_js_1 = require("./untreated-condition-reminder.config.js");
const booking_url_util_js_1 = require("../../common/utils/booking-url.util.js");
const CONDITION_PATIENT_LABELS = {
    cavity: 'areas of tooth decay',
    caries: 'areas of tooth decay',
    decay: 'tooth decay',
    fracture: 'a chipped or cracked tooth',
    cracked: 'a cracked tooth',
    missing: 'a missing tooth gap',
    abscess: 'a dental infection',
    infection: 'a dental infection',
    gingivitis: 'gum inflammation',
    periodontitis: 'gum disease',
    calculus: 'plaque and tartar buildup',
    erosion: 'enamel wear',
    sensitivity: 'tooth sensitivity',
    rct: 'an untreated root canal need',
    root_canal: 'an untreated root canal need',
    crown_needed: 'a tooth needing protection',
    implant_needed: 'a gap needing restoration',
};
function humanizeCondition(raw) {
    const key = raw.toLowerCase().replace(/\s+/g, '_');
    return CONDITION_PATIENT_LABELS[key] ?? raw.replace(/_/g, ' ').toLowerCase();
}
function uniquePatientLabels(findings) {
    const labels = findings.map((f) => humanizeCondition(f.condition));
    return [...new Set(labels)];
}
function anchorDateKey(d) {
    return d.toISOString().slice(0, 10);
}
function parseToothFdiNumbers(raw) {
    if (!raw?.trim())
        return [];
    return raw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
}
function substituteReminderPlaceholders(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
let UntreatedConditionReminderService = UntreatedConditionReminderService_1 = class UntreatedConditionReminderService {
    prisma;
    communicationService;
    automationService;
    aiService;
    logger = new common_1.Logger(UntreatedConditionReminderService_1.name);
    constructor(prisma, communicationService, automationService, aiService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
        this.automationService = automationService;
        this.aiService = aiService;
    }
    async findPatientsWithUntreatedConditions(clinicId) {
        const [conditions, startedTreatments] = await Promise.all([
            this.prisma.patientToothCondition.findMany({
                where: { clinic_id: clinicId },
                include: { tooth: true, patient: { select: { id: true, first_name: true, last_name: true, phone: true, email: true, branch_id: true } } },
            }),
            this.prisma.treatment.findMany({
                where: {
                    clinic_id: clinicId,
                    status: { in: ['in_progress', 'completed'] },
                    tooth_number: { not: null },
                },
                select: { patient_id: true, tooth_number: true },
            }),
        ]);
        const treatedByPatient = new Map();
        for (const t of startedTreatments) {
            if (!t.tooth_number)
                continue;
            const set = treatedByPatient.get(t.patient_id) ?? new Set();
            for (const fdi of parseToothFdiNumbers(t.tooth_number)) {
                set.add(String(fdi));
            }
            treatedByPatient.set(t.patient_id, set);
        }
        const byPatient = new Map();
        for (const c of conditions) {
            const fdi = c.tooth?.fdi_number;
            if (!fdi || !c.patient)
                continue;
            const treated = treatedByPatient.get(c.patient_id);
            if (treated?.has(String(fdi)))
                continue;
            const existing = byPatient.get(c.patient_id);
            const finding = {
                condition: c.condition,
                fdi,
                createdAt: c.created_at,
            };
            if (!existing) {
                byPatient.set(c.patient_id, {
                    patientId: c.patient_id,
                    firstName: c.patient.first_name,
                    lastName: c.patient.last_name,
                    phone: c.patient.phone,
                    email: c.patient.email,
                    branchId: c.patient.branch_id,
                    findings: [finding],
                    anchorAt: c.created_at,
                });
            }
            else {
                existing.findings.push(finding);
                if (c.created_at < existing.anchorAt) {
                    existing.anchorAt = c.created_at;
                }
            }
        }
        return [...byPatient.values()].filter((p) => p.findings.length > 0);
    }
    async wasReminderSent(clinicId, patientId, reminderIndex, anchorAt) {
        const anchorKey = anchorDateKey(anchorAt);
        const existing = await this.prisma.communicationMessage.findFirst({
            where: {
                clinic_id: clinicId,
                patient_id: patientId,
                direction: 'outbound',
                created_at: { gte: anchorAt },
                metadata: { path: ['automation'], equals: 'untreated_condition_reminder' },
                AND: [
                    { metadata: { path: ['reminder_index'], equals: reminderIndex } },
                    { metadata: { path: ['anchor_at'], equals: anchorKey } },
                ],
            },
            select: { id: true },
        });
        return Boolean(existing);
    }
    isDelayElapsed(anchorAt, delayMinutes) {
        const due = new Date(anchorAt.getTime() + delayMinutes * 60 * 1000);
        return new Date() >= due;
    }
    async processClinic(clinic, resolveChannel) {
        const rule = await this.automationService.getRuleConfig(clinic.id, 'untreated_condition_reminder');
        if (!rule?.is_enabled)
            return 0;
        const config = (0, untreated_condition_reminder_config_js_1.parseUntreatedConditionConfig)(rule.config ?? {});
        const patients = await this.findPatientsWithUntreatedConditions(clinic.id);
        let sent = 0;
        for (const snapshot of patients) {
            for (const reminderIndex of [1, 2]) {
                const enabled = reminderIndex === 1 ? config.reminder_1_enabled : config.reminder_2_enabled;
                if (!enabled)
                    continue;
                const delayRaw = reminderIndex === 1 ? config.reminder_1_delay : config.reminder_2_delay;
                const delayMinutes = (0, untreated_condition_reminder_config_js_1.parseReminderDelayMinutes)(delayRaw);
                if (!this.isDelayElapsed(snapshot.anchorAt, delayMinutes))
                    continue;
                if (await this.wasReminderSent(clinic.id, snapshot.patientId, reminderIndex, snapshot.anchorAt)) {
                    continue;
                }
                if (reminderIndex === 2 && config.reminder_1_enabled) {
                    const r1Sent = await this.wasReminderSent(clinic.id, snapshot.patientId, 1, snapshot.anchorAt);
                    if (!r1Sent)
                        continue;
                }
                try {
                    await this.sendReminder(clinic, snapshot, reminderIndex, rule, resolveChannel);
                    sent++;
                }
                catch (e) {
                    this.logger.warn(`Untreated condition reminder failed for patient ${snapshot.patientId}: ${e.message}`);
                }
            }
        }
        return sent;
    }
    async sendReminder(clinic, snapshot, reminderIndex, rule, resolveChannel) {
        const conditionLabels = uniquePatientLabels(snapshot.findings);
        const templateId = rule.template_id ?? undefined;
        let concernsSummary = conditionLabels.slice(0, 3).join(', ');
        let urgencyNote = 'Early care keeps treatment simpler and more comfortable. A short visit can prevent the issue from progressing.';
        let fullMessage = '';
        try {
            const ai = await this.aiService.generateUntreatedConditionReminderMessage(clinic.id, {
                patient_first_name: snapshot.firstName,
                clinic_name: clinic.name,
                conditions: conditionLabels,
                reminder_number: reminderIndex,
            });
            concernsSummary = ai.concerns_summary || concernsSummary;
            urgencyNote = ai.urgency_note || urgencyNote;
            fullMessage = ai.full_message || '';
        }
        catch (e) {
            this.logger.warn(`AI reminder copy failed, using fallback: ${e.message}`);
            fullMessage = `Hi ${snapshot.firstName}, during your visit at ${clinic.name} we noted ${concernsSummary}. Early care helps avoid discomfort later. Please call us to schedule a visit.`;
        }
        const phone = clinic.phone || '';
        const bookingUrl = snapshot.branchId
            ? (0, booking_url_util_js_1.getBookingUrl)(clinic.id, snapshot.branchId)
            : '';
        const templateVars = {
            patient_name: `${snapshot.firstName} ${snapshot.lastName}`,
            patient_first_name: snapshot.firstName,
            clinic_name: clinic.name,
            concerns_summary: concernsSummary,
            urgency_note: urgencyNote,
            phone,
            booking_url: bookingUrl,
        };
        const resolvedFullMessage = fullMessage
            ? substituteReminderPlaceholders(fullMessage, templateVars)
            : '';
        const body = templateId
            ? undefined
            : resolvedFullMessage ||
                `Hi ${snapshot.firstName}, during your visit at ${clinic.name} we noted: ${concernsSummary}. ${urgencyNote} Please call us at ${phone} to schedule your visit.`;
        const channel = await resolveChannel(clinic.id, snapshot.patientId, rule.channel);
        await this.communicationService.sendMessage(clinic.id, {
            patient_id: snapshot.patientId,
            channel,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: templateId,
            body,
            variables: {
                ...templateVars,
                '1': snapshot.firstName,
                '2': clinic.name,
                '3': concernsSummary,
                '4': urgencyNote,
                '5': phone,
            },
            metadata: {
                automation: 'untreated_condition_reminder',
                reminder_index: reminderIndex,
                anchor_at: anchorDateKey(snapshot.anchorAt),
                condition_count: snapshot.findings.length,
            },
        });
    }
};
exports.UntreatedConditionReminderService = UntreatedConditionReminderService;
exports.UntreatedConditionReminderService = UntreatedConditionReminderService = UntreatedConditionReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService,
        ai_service_js_1.AiService])
], UntreatedConditionReminderService);
//# sourceMappingURL=untreated-condition-reminder.service.js.map