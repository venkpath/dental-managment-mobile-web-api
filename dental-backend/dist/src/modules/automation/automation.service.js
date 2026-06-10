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
const automation_defaults_config_js_1 = require("./automation-defaults.config.js");
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
        const hasAllTypes = (0, automation_defaults_config_js_1.getAllAutomationRuleTypes)().every((t) => existingTypes.has(t));
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
    async seedClinicAutomationDefaults(clinicId) {
        await this.seedDefaults(clinicId);
    }
    async seedDefaults(clinicId) {
        const templateIds = await this.resolveSystemTemplateIds();
        const rows = automation_defaults_config_js_1.CLINIC_AUTOMATION_DEFAULTS.map((d) => this.buildRuleRow(clinicId, d, templateIds));
        await this.prisma.automationRule.createMany({
            data: rows,
            skipDuplicates: true,
        });
        for (const d of automation_defaults_config_js_1.CLINIC_AUTOMATION_DEFAULTS) {
            if (!d.template_name)
                continue;
            const templateId = templateIds.get(d.template_name);
            if (!templateId)
                continue;
            await this.prisma.automationRule.updateMany({
                where: {
                    clinic_id: clinicId,
                    rule_type: d.rule_type,
                    template_id: null,
                },
                data: { template_id: templateId },
            });
        }
        this.logger.log(`Seeded default automation rules for clinic ${clinicId} (skipDuplicates=true)`);
    }
    buildRuleRow(clinicId, d, templateIds) {
        const config = JSON.parse(JSON.stringify(d.config));
        if (d.reminder_template_names) {
            for (const slot of [1, 2]) {
                const name = d.reminder_template_names[slot];
                const id = name ? templateIds.get(name) : undefined;
                if (id)
                    config[`reminder_${slot}_template_id`] = id;
            }
        }
        const templateId = d.template_name ? templateIds.get(d.template_name) ?? null : null;
        return {
            clinic_id: clinicId,
            rule_type: d.rule_type,
            is_enabled: d.is_enabled,
            channel: d.channel,
            template_id: templateId,
            config: config,
        };
    }
    async resolveSystemTemplateIds() {
        const names = new Set();
        for (const d of automation_defaults_config_js_1.CLINIC_AUTOMATION_DEFAULTS) {
            if (d.template_name)
                names.add(d.template_name);
            if (d.reminder_template_names) {
                Object.values(d.reminder_template_names).forEach((n) => n && names.add(n));
            }
        }
        const templates = await this.prisma.messageTemplate.findMany({
            where: {
                clinic_id: null,
                template_name: { in: [...names] },
                is_active: true,
            },
            select: { id: true, template_name: true },
        });
        const map = new Map();
        for (const t of templates) {
            map.set(t.template_name, t.id);
        }
        const missing = [...names].filter((n) => !map.has(n));
        if (missing.length > 0) {
            this.logger.warn(`Automation seed: system templates not found (rules will have null template_id): ${missing.join(', ')}`);
        }
        return map;
    }
};
exports.AutomationService = AutomationService;
exports.AutomationService = AutomationService = AutomationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], AutomationService);
//# sourceMappingURL=automation.service.js.map