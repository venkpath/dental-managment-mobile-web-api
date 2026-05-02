import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { stripDoctorPrefix } from '../../common/utils/name.util.js';

type ClinicWithPlan = Prisma.ClinicGetPayload<{
  include: { plan: { select: { name: true; price_monthly: true; price_yearly: true } } };
}>;

/**
 * Daily cron that sends WhatsApp payment reminders to clinic admins.
 *
 * Two flavours:
 *   1. Trial reminders   — based on `clinic.trial_ends_at`.
 *   2. Renewal reminders — based on `clinic.next_billing_at` (populated
 *                          from Razorpay subscription webhooks).
 *
 * Configuration lives in the `subscription_payment_reminder` automation
 * rule (per-clinic). The rule's `config` JSON controls which day-offsets
 * to fire on. If the rule is disabled for a clinic, the clinic is skipped.
 *
 * Idempotency is enforced by checking the `CommunicationMessage` audit
 * log for a message with the same template + recipient sent in the last
 * 22 hours, so re-runs of the cron don't produce duplicates.
 *
 * Recipient = first User with role=Admin (case-insensitive), status=active,
 * and a non-empty `phone` field. If no such user exists, the clinic is
 * skipped with a log entry.
 */
@Injectable()
export class SubscriptionReminderService {
  private readonly logger = new Logger(SubscriptionReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
  ) {}

  // Run daily at 09:00 IST.
  @Cron('0 0 9 * * *', { timeZone: 'Asia/Kolkata' })
  async sendDailyReminders(): Promise<void> {
    this.logger.log('Starting daily subscription reminder cron');
    try {
      await Promise.all([
        this.processTrialReminders(),
        this.processRenewalReminders(),
        this.processExpiredReminders(),
      ]);
    } catch (e) {
      this.logger.error(`Subscription reminder cron failed: ${(e as Error).message}`, (e as Error).stack);
    }
    this.logger.log('Daily subscription reminder cron complete');
  }

  // ─── Trial reminders ───

  private async processTrialReminders(): Promise<void> {
    const now = new Date();
    const windowStart = this.startOfDay(this.addDays(now, -7));
    const windowEnd = this.endOfDay(this.addDays(now, 7));

    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription_status: 'trial',
        trial_ends_at: { gte: windowStart, lte: windowEnd },
      },
      include: { plan: { select: { name: true, price_monthly: true, price_yearly: true } } },
    });

    for (const clinic of clinics) {
      try {
        await this.sendTrialReminderForClinic(clinic);
      } catch (e) {
        this.logger.warn(`Trial reminder failed for clinic ${clinic.id}: ${(e as Error).message}`);
      }
    }
  }

  private async sendTrialReminderForClinic(
    clinic: ClinicWithPlan,
  ): Promise<void> {
    if (!clinic || !clinic.trial_ends_at) return;

    const rule = await this.automationService.getRuleConfig(clinic.id, 'subscription_payment_reminder');
    if (rule && !rule.is_enabled) {
      this.logger.log(`subscription_payment_reminder disabled for clinic ${clinic.id} — skipping`);
      return;
    }

    const config = (rule?.config as Record<string, unknown>) ?? {};
    const daysBefore = this.parseNumberArray(config['trial_reminder_days_before'], [3, 1]);
    const daysAfter = this.parseNumberArray(config['trial_reminder_days_after'], [0]);
    const daysPostTrial = this.parseNumberArray(config['post_trial_reminder_days_after'], [3, 7]);

    const today = this.startOfDay(new Date());
    const trialEnd = this.startOfDay(clinic.trial_ends_at);
    const daysFromTrialEnd = Math.round((trialEnd.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    let templateName: string | null = null;
    if (daysFromTrialEnd > 0 && daysBefore.includes(daysFromTrialEnd)) {
      templateName = 'platform_trial_ending_soon';
    } else if (daysFromTrialEnd <= 0 && daysAfter.includes(-daysFromTrialEnd)) {
      templateName = 'platform_trial_expired';
    } else if (daysFromTrialEnd < 0 && daysPostTrial.includes(-daysFromTrialEnd)) {
      templateName = 'platform_payment_reminder_post_trial';
    }

    if (!templateName) return;

    const admin = await this.findAdminUser(clinic.id);
    if (!admin) {
      this.logger.log(`No admin with phone for clinic ${clinic.id} — skipping ${templateName}`);
      return;
    }

    if (await this.alreadySentToday(clinic.id, templateName, admin.phone!)) {
      this.logger.log(`${templateName} already sent today for clinic ${clinic.id} — skipping`);
      return;
    }

    const namedVars: Record<string, string> = {
      Dentist_Name: stripDoctorPrefix(admin.name),
      Trial_End_Date: this.formatDate(trialEnd),
    };

    await this.communicationService.sendStaffWhatsAppTemplate(
      clinic.id,
      admin.phone!,
      templateName,
      namedVars,
      {
        automation: 'subscription_payment_reminder',
        reminder_kind: templateName,
        days_from_trial_end: daysFromTrialEnd,
        admin_user_id: admin.id,
      },
    );

    this.logger.log(`Sent ${templateName} to ${admin.phone} for clinic ${clinic.id}`);
  }

  // ─── Renewal reminders ───

  private async processRenewalReminders(): Promise<void> {
    const now = new Date();
    const windowStart = this.startOfDay(now);
    const windowEnd = this.endOfDay(this.addDays(now, 14));

    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription_status: 'active',
        next_billing_at: { gte: windowStart, lte: windowEnd },
      },
      include: { plan: { select: { name: true, price_monthly: true, price_yearly: true } } },
    });

    for (const clinic of clinics) {
      try {
        await this.sendRenewalReminderForClinic(clinic);
      } catch (e) {
        this.logger.warn(`Renewal reminder failed for clinic ${clinic.id}: ${(e as Error).message}`);
      }
    }
  }

  private async sendRenewalReminderForClinic(
    clinic: ClinicWithPlan,
  ): Promise<void> {
    if (!clinic || !clinic.next_billing_at) return;

    const rule = await this.automationService.getRuleConfig(clinic.id, 'subscription_payment_reminder');
    if (rule && !rule.is_enabled) {
      this.logger.log(`subscription_payment_reminder disabled for clinic ${clinic.id} — skipping renewal`);
      return;
    }

    const config = (rule?.config as Record<string, unknown>) ?? {};
    const daysBefore = this.parseNumberArray(config['renewal_reminder_days_before'], [7, 3, 1]);

    const today = this.startOfDay(new Date());
    const renewal = this.startOfDay(clinic.next_billing_at);
    const daysUntilRenewal = Math.round((renewal.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (daysUntilRenewal <= 0 || !daysBefore.includes(daysUntilRenewal)) return;

    const templateName = 'platform_subscription_renewal_reminder';
    const admin = await this.findAdminUser(clinic.id);
    if (!admin) {
      this.logger.log(`No admin with phone for clinic ${clinic.id} — skipping ${templateName}`);
      return;
    }

    if (await this.alreadySentToday(clinic.id, templateName, admin.phone!)) {
      this.logger.log(`${templateName} already sent today for clinic ${clinic.id} — skipping`);
      return;
    }

    const namedVars: Record<string, string> = {
      Dentist_Name: stripDoctorPrefix(admin.name),
      Renewal_Date: this.formatDate(renewal),
    };

    await this.communicationService.sendStaffWhatsAppTemplate(
      clinic.id,
      admin.phone!,
      templateName,
      namedVars,
      {
        automation: 'subscription_payment_reminder',
        reminder_kind: templateName,
        days_until_renewal: daysUntilRenewal,
        admin_user_id: admin.id,
      },
    );

    this.logger.log(`Sent ${templateName} (${daysUntilRenewal}d) to ${admin.phone} for clinic ${clinic.id}`);
  }

  // ─── Expired-subscription reminders ───
  //
  // After a subscription ends (status=expired or cancelled) we follow up
  // twice:
  //   - platform_subscription_expired   — day-of / right after expiry
  //   - platform_final_payment_reminder — longer tail (high priority)
  //
  // Day-offsets are configurable per-clinic via the
  // `subscription_payment_reminder` automation rule.
  private async processExpiredReminders(): Promise<void> {
    const now = new Date();
    const windowStart = this.startOfDay(this.addDays(now, -30));
    const windowEnd = this.endOfDay(now);

    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription_status: { in: ['expired', 'cancelled'] },
        OR: [
          { next_billing_at: { gte: windowStart, lte: windowEnd } },
          { trial_ends_at: { gte: windowStart, lte: windowEnd } },
        ],
      },
      include: { plan: { select: { name: true, price_monthly: true, price_yearly: true } } },
    });

    for (const clinic of clinics) {
      try {
        await this.sendExpiredReminderForClinic(clinic);
      } catch (e) {
        this.logger.warn(`Expired reminder failed for clinic ${clinic.id}: ${(e as Error).message}`);
      }
    }
  }

  private async sendExpiredReminderForClinic(
    clinic: ClinicWithPlan,
  ): Promise<void> {
    if (!clinic) return;
    // Anchor expiry on the most recent of next_billing_at / trial_ends_at.
    const anchor = clinic.next_billing_at ?? clinic.trial_ends_at;
    if (!anchor) return;

    const rule = await this.automationService.getRuleConfig(clinic.id, 'subscription_payment_reminder');
    if (rule && !rule.is_enabled) {
      this.logger.log(`subscription_payment_reminder disabled for clinic ${clinic.id} — skipping expired`);
      return;
    }

    const config = (rule?.config as Record<string, unknown>) ?? {};
    const expiredDays = this.parseNumberArray(config['expired_reminder_days_after'], [0, 1, 3]);
    const finalDays = this.parseNumberArray(config['final_reminder_days_after'], [7, 14]);

    const today = this.startOfDay(new Date());
    const expiredOn = this.startOfDay(anchor);
    const daysSinceExpiry = Math.round((today.getTime() - expiredOn.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceExpiry < 0) return;

    let templateName: string | null = null;
    if (finalDays.includes(daysSinceExpiry)) {
      templateName = 'platform_final_payment_reminder';
    } else if (expiredDays.includes(daysSinceExpiry)) {
      templateName = 'platform_subscription_expired';
    }
    if (!templateName) return;

    const admin = await this.findAdminUser(clinic.id);
    if (!admin) {
      this.logger.log(`No admin with phone for clinic ${clinic.id} — skipping ${templateName}`);
      return;
    }

    if (await this.alreadySentToday(clinic.id, templateName, admin.phone!)) {
      this.logger.log(`${templateName} already sent today for clinic ${clinic.id} — skipping`);
      return;
    }

    const namedVars: Record<string, string> = {
      Dentist_Name: stripDoctorPrefix(admin.name),
    };

    await this.communicationService.sendStaffWhatsAppTemplate(
      clinic.id,
      admin.phone!,
      templateName,
      namedVars,
      {
        automation: 'subscription_payment_reminder',
        reminder_kind: templateName,
        days_since_expiry: daysSinceExpiry,
        admin_user_id: admin.id,
      },
    );

    this.logger.log(`Sent ${templateName} (+${daysSinceExpiry}d) to ${admin.phone} for clinic ${clinic.id}`);
  }

  // ─── Helpers ───

  /**
   * Pick the recipient for SaaS-billing notifications: the clinic's admin
   * user. Prefers an active admin with a phone on file. Returns null if
   * none qualify.
   */
  private async findAdminUser(clinicId: string) {
    const candidates = await this.prisma.user.findMany({
      where: {
        clinic_id: clinicId,
        status: 'active',
        phone: { not: null },
      },
      select: { id: true, name: true, phone: true, role: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });

    const admin = candidates.find((u) => u.role.toLowerCase() === 'admin');
    if (admin && admin.phone && admin.phone.trim()) return admin;
    return null;
  }

  /**
   * Dedup: returns true if the same staff template has already been
   * delivered (or queued) to this recipient in the last 22 hours.
   */
  private async alreadySentToday(clinicId: string, templateName: string, phone: string): Promise<boolean> {
    const since = new Date(Date.now() - 22 * 60 * 60 * 1000);
    const tpl = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: templateName,
        channel: 'whatsapp',
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' },
      select: { id: true },
    });
    if (!tpl) return false;

    const digitsOnly = phone.replace(/[^0-9]/g, '');
    const last10 = digitsOnly.slice(-10);
    const normalizedPhone = last10.length === 10 ? `91${last10}` : digitsOnly;

    const existing = await this.prisma.communicationMessage.findFirst({
      where: {
        clinic_id: clinicId,
        template_id: tpl.id,
        recipient: normalizedPhone,
        created_at: { gte: since },
        status: { notIn: ['failed', 'skipped'] },
      },
      select: { id: true },
    });
    return !!existing;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  }

  private parseNumberArray(value: unknown, fallback: number[]): number[] {
    if (!Array.isArray(value)) return fallback;
    const nums = value
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0);
    return nums.length > 0 ? nums : fallback;
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  private addDays(d: Date, days: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }
}
