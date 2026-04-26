import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { AppointmentReminderProducer } from './appointment-reminder.producer.js';

const CLINIC_TIMEZONE = 'Asia/Kolkata';

function getDateStrInClinicTz(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: CLINIC_TIMEZONE });
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

@Injectable()
export class AppointmentReminderReconciler {
  private readonly logger = new Logger(AppointmentReminderReconciler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderProducer: AppointmentReminderProducer,
  ) {}

  /**
   * Safety net: every 5 minutes, ensure upcoming scheduled appointments
   * have reminder jobs enqueued per automation config.
   */
  @Cron('0 */5 * * * *')
  async reconcileUpcomingReminderJobs(): Promise<void> {
    const today = getDateStrInClinicTz(new Date());
    const maxDate = addDaysToDateStr(today, 2);

    const upcoming = await this.prisma.appointment.findMany({
      where: {
        status: 'scheduled',
        appointment_date: {
          gte: new Date(today),
          lte: new Date(maxDate),
        },
      },
      select: {
        id: true,
        clinic_id: true,
        appointment_date: true,
        start_time: true,
      },
      take: 1000,
      orderBy: { appointment_date: 'asc' },
    });

    if (upcoming.length === 0) return;

    const results = await Promise.allSettled(
      upcoming.map((appt) =>
        this.reminderProducer.scheduleReminders(
          appt.id,
          appt.clinic_id,
          appt.appointment_date,
          appt.start_time,
        ),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(
        `Reminder reconciliation completed with failures: ${failed}/${upcoming.length}`,
      );
      return;
    }

    this.logger.debug(`Reminder reconciliation complete for ${upcoming.length} upcoming appointments`);
  }
}