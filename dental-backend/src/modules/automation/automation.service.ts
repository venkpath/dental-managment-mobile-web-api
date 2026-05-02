import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpsertAutomationRuleDto, AutomationRuleType } from './dto/index.js';

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
        config: {
          // TWO independently configurable reminders.
          // hours range: 0.5 (30 min) to 24 (24 hours).
          // template_id: null = uses default (no template). Set to UUID to use Meta template.
          reminder_1_enabled: true,
          reminder_1_hours: 24,
          reminder_1_template_id: null,
          reminder_2_enabled: true,
          reminder_2_hours: 2,
          reminder_2_template_id: null,
        },
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
      // ── Dentist-side notifications ──
      {
        rule_type: 'appointment_confirmation_dentist',
        is_enabled: true,
        channel: 'whatsapp',
        config: {},
      },
      {
        rule_type: 'appointment_reminder_dentist',
        is_enabled: true,
        channel: 'whatsapp',
        // Single reminder slot — admin picks how many hours before the
        // appointment the dentist gets pinged. Default 2h matches the
        // prior piggy-back behaviour. Toggle is_enabled to turn it off.
        config: { hours: 2 },
      },
      // ── Platform/SaaS billing reminders (sent to clinic admin) ──
      {
        rule_type: 'subscription_payment_reminder',
        is_enabled: true,
        channel: 'whatsapp',
        config: {
          // Days BEFORE trial_ends_at to send "trial ending" reminders.
          trial_reminder_days_before: [3, 1],
          // Days AFTER trial_ends_at to send "trial expired" reminder.
          trial_reminder_days_after: [1],
          // Days BEFORE next_billing_at to send renewal reminders.
          renewal_reminder_days_before: [7, 3, 1],
        },
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

  /** Returns list of all default rule types for completeness checks */
  private getDefaultRuleTypes(): string[] {
    return [
      'birthday_greeting', 'festival_greeting', 'post_treatment_care',
      'no_show_followup', 'dormant_reactivation', 'treatment_plan_reminder',
      'payment_reminder', 'feedback_collection', 'appointment_reminder_patient',
      'appointment_confirmation', 'appointment_cancellation', 'appointment_rescheduled',
      'payment_confirmation', 'invoice_ready', 'payment_overdue',
      'prescription_ready',
      'appointment_confirmation_dentist', 'appointment_reminder_dentist',
      'subscription_payment_reminder',
    ];
  }
}
