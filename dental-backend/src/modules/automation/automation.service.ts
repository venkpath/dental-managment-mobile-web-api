import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpsertAutomationRuleDto, AutomationRuleType } from './dto/index.js';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Get all automation rules for a clinic (creates defaults if none exist) */
  async getAllRules(clinicId: string) {
    const existing = await this.prisma.automationRule.findMany({
      where: { clinic_id: clinicId },
      include: { template: { select: { id: true, template_name: true, channel: true } } },
      orderBy: { rule_type: 'asc' },
    });

    // If no rules exist, create defaults
    if (existing.length === 0) {
      await this.seedDefaults(clinicId);
      return this.prisma.automationRule.findMany({
        where: { clinic_id: clinicId },
        include: { template: { select: { id: true, template_name: true, channel: true } } },
        orderBy: { rule_type: 'asc' },
      });
    }

    return existing;
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

  /** Seed default automation rules for a new clinic */
  private async seedDefaults(clinicId: string) {
    const defaults: { rule_type: string; is_enabled: boolean; channel: string; config: Record<string, unknown> }[] = [
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
    ];

    await this.prisma.automationRule.createMany({
      data: defaults.map((d) => ({
        clinic_id: clinicId,
        ...d,
        config: JSON.parse(JSON.stringify(d.config)),
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Seeded ${defaults.length} default automation rules for clinic ${clinicId}`);
  }
}
