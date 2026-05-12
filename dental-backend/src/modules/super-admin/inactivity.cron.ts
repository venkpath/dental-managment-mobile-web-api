import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { SuperAdminWhatsAppService } from './super-admin-whatsapp.service.js';

// WhatsApp template names — create and get these approved in Meta Business Manager
export const INACTIVITY_TEMPLATE_REMINDER_30 = 'clinic_inactivity_reminder_30';
export const INACTIVITY_TEMPLATE_REMINDER_40 = 'clinic_inactivity_reminder_40';
export const INACTIVITY_TEMPLATE_SUSPENDED   = 'clinic_account_suspended';

const DAY_MS        = 24 * 60 * 60 * 1000;
const GRACE_DAYS    = 30;
const REMIND_30_DAY = 30;
const REMIND_40_DAY = 40;
const SUSPEND_DAY   = 45;

type ClinicRow = {
  id: string;
  name: string;
  last_active_at: Date | null;
  created_at: Date;
  inactivity_reminder_30_sent: boolean;
  inactivity_reminder_40_sent: boolean;
  users: { name: string; phone: string | null }[];
};

@Injectable()
export class InactivityCronService {
  private readonly logger = new Logger(InactivityCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsApp: SuperAdminWhatsAppService,
  ) {}

  @Cron('0 0 9 * * *', { timeZone: 'Asia/Kolkata' })
  async checkInactivity(): Promise<void> {
    this.logger.log('Inactivity check started');

    const now = new Date();
    const graceCutoff = new Date(now.getTime() - GRACE_DAYS * DAY_MS);

    const clinics = await this.prisma.clinic.findMany({
      where: {
        is_suspended: false,
        created_at: { lt: graceCutoff },
      },
      select: {
        id: true,
        name: true,
        last_active_at: true,
        created_at: true,
        inactivity_reminder_30_sent: true,
        inactivity_reminder_40_sent: true,
        users: {
          where: { role: 'SuperAdmin' },
          select: { name: true, phone: true },
          take: 1,
        },
      },
    });

    let warned30 = 0, warned40 = 0, suspended = 0;

    for (const clinic of clinics) {
      try {
        const baseline = clinic.last_active_at ?? clinic.created_at;
        const daysInactive = Math.floor((now.getTime() - baseline.getTime()) / DAY_MS);

        if (daysInactive >= SUSPEND_DAY) {
          await this.suspendClinic(clinic, now);
          suspended++;
        } else if (daysInactive >= REMIND_40_DAY && !clinic.inactivity_reminder_40_sent) {
          await this.sendReminder(clinic, 40);
          warned40++;
        } else if (daysInactive >= REMIND_30_DAY && !clinic.inactivity_reminder_30_sent) {
          await this.sendReminder(clinic, 30);
          warned30++;
        }
      } catch (err) {
        this.logger.error(
          `Inactivity check failed for clinic ${clinic.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `Inactivity check done — checked: ${clinics.length}, warned30: ${warned30}, warned40: ${warned40}, suspended: ${suspended}`,
    );
  }

  /** Manually trigger — exposed via super admin API for testing */
  async runNow(): Promise<{ checked: number }> {
    await this.checkInactivity();
    return { checked: 1 };
  }

  private async suspendClinic(clinic: ClinicRow, now: Date): Promise<void> {
    await this.prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        is_suspended: true,
        suspended_at: now,
        suspension_reason: 'Automatically suspended after 45 days of inactivity',
      },
    });

    const admin = clinic.users[0];
    if (admin?.phone) {
      await this.whatsApp
        .sendTemplate({
          phone: admin.phone,
          templateName: INACTIVITY_TEMPLATE_SUSPENDED,
          bodyParams: [admin.name, clinic.name],
          contactName: admin.name,
        })
        .catch((err: Error) =>
          this.logger.warn(`WA suspension notice failed for ${clinic.id}: ${err.message}`),
        );
    }

    this.logger.warn(`Clinic ${clinic.id} (${clinic.name}) suspended for inactivity`);
  }

  private async sendReminder(clinic: ClinicRow, day: 30 | 40): Promise<void> {
    const admin = clinic.users[0];
    const daysLeft = day === 30 ? 15 : 5;
    const templateName =
      day === 30 ? INACTIVITY_TEMPLATE_REMINDER_30 : INACTIVITY_TEMPLATE_REMINDER_40;

    if (!admin?.phone) {
      this.logger.warn(`Skipping day-${day} reminder for clinic ${clinic.id} — no admin phone`);
      return;
    }

    try {
      await this.whatsApp.sendTemplate({
        phone: admin.phone,
        templateName,
        bodyParams: [admin.name, clinic.name, String(daysLeft)],
        contactName: admin.name,
      });
    } catch (err) {
      // Don't flip the reminder-sent flag — we'll retry on the next cron run
      this.logger.warn(
        `WA reminder-${day} failed for ${clinic.id}: ${err instanceof Error ? err.message : String(err)} — will retry tomorrow`,
      );
      return;
    }

    await this.prisma.clinic.update({
      where: { id: clinic.id },
      data:
        day === 30
          ? { inactivity_reminder_30_sent: true }
          : { inactivity_reminder_40_sent: true },
    });

    this.logger.log(`Sent day-${day} inactivity reminder to clinic ${clinic.id} (${clinic.name})`);
  }
}
