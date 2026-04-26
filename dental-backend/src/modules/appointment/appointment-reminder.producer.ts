import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import type { AppointmentReminderJobData } from './appointment-reminder.types.js';

/** IST offset = UTC+5:30 = 330 minutes */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Converts stored appointment_date (midnight UTC) + start_time string ("HH:MM" IST)
 * into the exact UTC Date when the appointment begins.
 */
function appointmentStartUtc(appointmentDate: Date, startTime: string): Date {
  const dateStr = appointmentDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
  // Treat "YYYY-MM-DDTHH:MM:00Z" as UTC, then subtract IST offset to get true UTC
  const naiveUtc = new Date(`${dateStr}T${startTime}:00Z`);
  return new Date(naiveUtc.getTime() - IST_OFFSET_MS);
}

/** BullMQ job name constant */
export const APPOINTMENT_REMINDER_JOB = 'send-appointment-reminder';

@Injectable()
export class AppointmentReminderProducer {
  private readonly logger = new Logger(AppointmentReminderProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.APPOINTMENT_REMINDER)
    private readonly reminderQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule up to 2 reminder jobs for an appointment.
   * Reads the clinic's automation rule config to determine timing + templates.
   * Jobs are named with deterministic IDs so they are idempotent.
   */
  async scheduleReminders(
    appointmentId: string,
    clinicId: string,
    appointmentDate: Date,
    startTime: string,
  ): Promise<void> {
    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });

    if (!rule?.is_enabled) return;

    const config = (rule.config as Record<string, unknown>) ?? {};
    const reminders: Array<{ index: 1 | 2; hours: number; enabled: boolean }> = [
      {
        index: 1,
        hours: (config['reminder_1_hours'] as number) ?? 24,
        enabled: config['reminder_1_enabled'] !== false,
      },
      {
        index: 2,
        hours: (config['reminder_2_hours'] as number) ?? 2,
        enabled: config['reminder_2_enabled'] !== false,
      },
    ];

    const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);

    for (const reminder of reminders) {
      if (!reminder.enabled) continue;
      if (typeof reminder.hours !== 'number' || reminder.hours <= 0) continue;

      const sendAt = new Date(apptStartUtc.getTime() - reminder.hours * 60 * 60 * 1000);
      const delay = sendAt.getTime() - Date.now();

      if (delay <= 0) {
        this.logger.debug(
          `Skipping reminder ${reminder.index} for appointment ${appointmentId} — send time already passed`,
        );
        continue;
      }

      const jobId = `appointment:${appointmentId}:reminder:${reminder.index}`;
      const jobData: AppointmentReminderJobData = {
        appointmentId,
        clinicId,
        reminderIndex: reminder.index,
        reminderHours: reminder.hours,
      };

      await this.reminderQueue.add(APPOINTMENT_REMINDER_JOB, jobData, {
        jobId,
        delay,
        removeOnComplete: true,
        removeOnFail: 100, // keep last 100 failed jobs for debugging
      });

      this.logger.log(
        `Scheduled reminder ${reminder.index} (${reminder.hours}h before) for appointment ${appointmentId} at ${sendAt.toISOString()}`,
      );
    }
  }

  /**
   * Cancel all scheduled reminders for an appointment (on cancellation).
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    for (const idx of [1, 2] as const) {
      const jobId = `appointment:${appointmentId}:reminder:${idx}`;
      const job = await this.reminderQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled reminder ${idx} for appointment ${appointmentId}`);
      }
    }
  }

  /**
   * Cancel existing reminders and schedule new ones (on reschedule).
   */
  async rescheduleReminders(
    appointmentId: string,
    clinicId: string,
    newAppointmentDate: Date,
    newStartTime: string,
  ): Promise<void> {
    await this.cancelReminders(appointmentId);
    await this.scheduleReminders(appointmentId, clinicId, newAppointmentDate, newStartTime);
  }
}
