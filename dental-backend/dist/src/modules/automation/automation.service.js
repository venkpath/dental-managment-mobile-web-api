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
var AutomationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let AutomationService = AutomationService_1 = class AutomationService {
    prisma;
    logger = new common_1.Logger(AutomationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllRules(clinicId) {
        const existing = await this.prisma.automationRule.findMany({
            where: { clinic_id: clinicId },
            include: { template: { select: { id: true, template_name: true, channel: true } } },
            orderBy: { rule_type: 'asc' },
        });
        await this.seedDefaults(clinicId);
        const existingTypes = new Set(existing.map((r) => r.rule_type));
        const hasAllTypes = this.getDefaultRuleTypes().every((t) => existingTypes.has(t));
        if (hasAllTypes) {
            return existing;
        }
        return this.prisma.automationRule.findMany({
            where: { clinic_id: clinicId },
            include: { template: { select: { id: true, template_name: true, channel: true } } },
            orderBy: { rule_type: 'asc' },
        });
    }
    async getRule(clinicId, ruleType) {
        const rule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: ruleType } },
            include: { template: { select: { id: true, template_name: true, channel: true } } },
        });
        if (!rule) {
            throw new common_1.NotFoundException(`Automation rule "${ruleType}" not found`);
        }
        return rule;
    }
    async upsertRule(clinicId, ruleType, dto) {
        return this.prisma.automationRule.upsert({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: ruleType } },
            create: {
                clinic_id: clinicId,
                rule_type: ruleType,
                is_enabled: dto.is_enabled ?? true,
                channel: dto.channel || 'preferred',
                template_id: dto.template_id,
                config: dto.config ? JSON.parse(JSON.stringify(dto.config)) : undefined,
            },
            update: {
                is_enabled: dto.is_enabled,
                channel: dto.channel,
                template_id: dto.template_id,
                config: dto.config ? JSON.parse(JSON.stringify(dto.config)) : undefined,
            },
            include: { template: { select: { id: true, template_name: true, channel: true } } },
        });
    }
    async isRuleEnabled(clinicId, ruleType) {
        const rule = await this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: ruleType } },
            select: { is_enabled: true },
        });
        if (!rule) {
            return ['appointment_reminder_patient', 'payment_reminder'].includes(ruleType);
        }
        return rule.is_enabled;
    }
    async getRuleConfig(clinicId, ruleType) {
        return this.prisma.automationRule.findUnique({
            where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: ruleType } },
            include: { template: true },
        });
    }
    async seedDefaults(clinicId) {
        const defaults = [
            {
                rule_type: 'birthday_greeting',
                is_enabled: false,
                channel: 'preferred',
                config: { send_time: '09:00', include_offer: false },
            },
            {
                rule_type: 'festival_greeting',
                is_enabled: false,
                channel: 'preferred',
                config: { send_day_before: false },
            },
            {
                rule_type: 'post_treatment_care',
                is_enabled: true,
                channel: 'preferred',
                config: { delay_hours: 1 },
            },
            {
                rule_type: 'no_show_followup',
                is_enabled: true,
                channel: 'preferred',
                config: { delay_hours: 1 },
            },
            {
                rule_type: 'dormant_reactivation',
                is_enabled: false,
                channel: 'preferred',
                config: { dormancy_months: 6, check_interval_days: 7 },
            },
            {
                rule_type: 'treatment_plan_reminder',
                is_enabled: true,
                channel: 'preferred',
                config: { reminder_interval_days: 14 },
            },
            {
                rule_type: 'payment_reminder',
                is_enabled: true,
                channel: 'preferred',
                config: { days_before_due: 3 },
            },
            {
                rule_type: 'feedback_collection',
                is_enabled: false,
                channel: 'preferred',
                config: { delay_hours: 4, min_rating_for_google_review: 4 },
            },
            {
                rule_type: 'appointment_reminder_patient',
                is_enabled: true,
                channel: 'preferred',
                config: { reminder_24hr: true, reminder_2hr: true },
            },
            {
                rule_type: 'appointment_confirmation',
                is_enabled: true,
                channel: 'whatsapp',
                config: {},
            },
            {
                rule_type: 'appointment_cancellation',
                is_enabled: true,
                channel: 'whatsapp',
                config: {},
            },
            {
                rule_type: 'appointment_rescheduled',
                is_enabled: true,
                channel: 'whatsapp',
                config: {},
            },
            {
                rule_type: 'payment_confirmation',
                is_enabled: true,
                channel: 'preferred',
                config: {},
            },
            {
                rule_type: 'invoice_ready',
                is_enabled: true,
                channel: 'whatsapp',
                config: {},
            },
            {
                rule_type: 'payment_overdue',
                is_enabled: true,
                channel: 'preferred',
                config: { days_overdue: 1 },
            },
            {
                rule_type: 'prescription_ready',
                is_enabled: true,
                channel: 'whatsapp',
                config: {},
            },
        ];
        await this.prisma.automationRule.createMany({
            data: defaults.map((d) => ({
                clinic_id: clinicId,
                ...d,
                config: JSON.parse(JSON.stringify(d.config)),
            })),
            skipDuplicates: true,
        });
        this.logger.log(`Seeded default automation rules for clinic ${clinicId} (skipDuplicates=true)`);
    }
    getDefaultRuleTypes() {
        return [
            'birthday_greeting', 'festival_greeting', 'post_treatment_care',
            'no_show_followup', 'dormant_reactivation', 'treatment_plan_reminder',
            'payment_reminder', 'feedback_collection', 'appointment_reminder_patient',
            'appointment_confirmation', 'appointment_cancellation', 'appointment_rescheduled',
            'payment_confirmation', 'invoice_ready', 'payment_overdue',
            'prescription_ready',
        ];
    }
};
exports.AutomationService = AutomationService;
exports.AutomationService = AutomationService = AutomationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], AutomationService);
//# sourceMappingURL=automation.service.js.map