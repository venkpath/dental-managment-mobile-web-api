import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpsertAutomationRuleDto, AutomationRuleType } from './dto/index.js';
import {
  CLINIC_AUTOMATION_DEFAULTS,
  getAllAutomationRuleTypes,
  type AutomationRuleDefault,
} from './automation-defaults.config.js';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Get all automation rules for a clinic (creates defaults for any missing rule types) */
  async getAllRules(clinicId: string) {
    const existing = await this.prisma.automationRule.findMany({
      where: { clinic_id: clinicId },
      include: { template: { select: { id: true, template_name: true, channel: true } } },
      orderBy: { rule_type: 'asc' },
    });

    // Seed any missing rule types (handles both new clinics and newly added rule types)
    await this.seedDefaults(clinicId);

    // Re-fetch if new rules were potentially added
    const existingTypes = new Set(existing.map((r) => r.rule_type));
    const hasAllTypes = getAllAutomationRuleTypes().every((t) => existingTypes.has(t));

    if (hasAllTypes) {
      return existing;
    }

    return this.prisma.automationRule.findMany({
      where: { clinic_id: clinicId },
      include: { template: { select: { id: true, template_name: true, channel: true } } },
      orderBy: { rule_type: 'asc' },
    });
  }

  /** Get a single rule */
  async getRule(clinicId: string, ruleType: string) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: ruleType } },
      include: { template: { select: { id: true, template_name: true, channel: true } } },
    });

    if (!rule) {
      throw new NotFoundException(`Automation rule "${ruleType}" not found`);
    }

    return rule;
  }

  /** Upsert a rule (admin configures) */
  async upsertRule(clinicId: string, ruleType: string, dto: UpsertAutomationRuleDto) {
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

  /** Check if a rule is enabled for a clinic */
  async isRuleEnabled(clinicId: string, ruleType: AutomationRuleType): Promise<boolean> {
    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: ruleType } },
      select: { is_enabled: true },
    });

    // Default: enabled for reminders, disabled for marketing
    if (!rule) {
      return ['appointment_reminder_patient', 'payment_reminder'].includes(ruleType);
    }

    return rule.is_enabled;
  }

  /** Get rule config for a specific clinic + type */
  async getRuleConfig(clinicId: string, ruleType: AutomationRuleType) {
    return this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: ruleType } },
      include: { template: true },
    });
  }

  /** Seed default automation rules for a clinic (idempotent). */
  async seedClinicAutomationDefaults(clinicId: string): Promise<void> {
    await this.seedDefaults(clinicId);
  }

  private async seedDefaults(clinicId: string) {
    const templateIds = await this.resolveSystemTemplateIds();

    const rows = CLINIC_AUTOMATION_DEFAULTS.map((d) => this.buildRuleRow(clinicId, d, templateIds));

    await this.prisma.automationRule.createMany({
      data: rows,
      skipDuplicates: true,
    });

    // Link templates on rules created before a template_name was added to defaults.
    for (const d of CLINIC_AUTOMATION_DEFAULTS) {
      if (!d.template_name) continue;
      const templateId = templateIds.get(d.template_name);
      if (!templateId) continue;
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

  private buildRuleRow(
    clinicId: string,
    d: AutomationRuleDefault,
    templateIds: Map<string, string>,
  ) {
    const config = JSON.parse(JSON.stringify(d.config)) as Record<string, unknown>;

    if (d.reminder_template_names) {
      for (const slot of [1, 2] as const) {
        const name = d.reminder_template_names[slot];
        const id = name ? templateIds.get(name) : undefined;
        if (id) config[`reminder_${slot}_template_id`] = id;
      }
    }

    const templateId = d.template_name ? templateIds.get(d.template_name) ?? null : null;

    return {
      clinic_id: clinicId,
      rule_type: d.rule_type,
      is_enabled: d.is_enabled,
      channel: d.channel,
      template_id: templateId,
      config: config as Prisma.InputJsonValue,
    };
  }

  /** Look up system template UUIDs by template_name (clinic_id null). */
  private async resolveSystemTemplateIds(): Promise<Map<string, string>> {
    const names = new Set<string>();
    for (const d of CLINIC_AUTOMATION_DEFAULTS) {
      if (d.template_name) names.add(d.template_name);
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

    const map = new Map<string, string>();
    for (const t of templates) {
      map.set(t.template_name, t.id);
    }

    const missing = [...names].filter((n) => !map.has(n));
    if (missing.length > 0) {
      this.logger.warn(
        `Automation seed: system templates not found (rules will have null template_id): ${missing.join(', ')}`,
      );
    }

    return map;
  }
}
