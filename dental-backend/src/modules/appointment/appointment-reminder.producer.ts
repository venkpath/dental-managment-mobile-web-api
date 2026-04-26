import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import type { AppointmentReminderJobData } from './appointment-reminder.types.js';
import { getReminderDefinitions } from './appointment-reminder.config.js';

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

    if (!rule) {
      this.logger.warn(`No automation rule found for clinic ${clinicId} — appointment reminders skipped`);
      return;
    }
    if (!rule.is_enabled) {
      this.logger.warn(`Appointment reminder rule is DISABLED for clinic ${clinicId} — reminders skipped`);
      return;
    }

    const config = (rule.config as Record<string, unknown>) ?? {};
    const reminders = getReminderDefinitions(config);

    const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);

    for (const reminder of reminders) {
      if (!reminder.enabled) {
        this.logger.log(`Reminder ${reminder.index} is disabled in config for clinic ${clinicId}`);
        continue;
      }

      const sendAt = new Date(apptStartUtc.getTime() - reminder.hours * 60 * 60 * 1000);
      const delay = sendAt.getTime() - Date.now();

      if (delay <= 0) {
        this.logger.warn(
          `Skipping reminder ${reminder.index} for appointment ${appointmentId} — fire time ${sendAt.toISOString()} already passed (${reminder.hours}h before appointment). Create appointment further in advance.`,
        );
        continue;
      }

      const jobId = `appointment-${appointmentId}-reminder-${reminder.index}`;
      const jobData: AppointmentReminderJobData = {
        appointmentId,
        clinicId,
        reminderIndex: reminder.index,
        reminderHours: reminder.hours,
      };

      try {
        await this.reminderQueue.add(APPOINTMENT_REMINDER_JOB, jobData, {
          jobId,
          delay,
          removeOnComplete: true,
          removeOnFail: 100, // keep last 100 failed jobs for debugging
        });

        this.logger.log(
          `Scheduled reminder ${reminder.index} (${reminder.hours}h before) for appointment ${appointmentId} at ${sendAt.toISOString()} [jobId=${jobId}]`,
        );
      } catch (e) {
        // Surface BullMQ/Redis errors loudly — silent failures here are the #1 cause of "no jobs"
        this.logger.error(
          `FAILED to enqueue reminder ${reminder.index} for appointment ${appointmentId} (jobId=${jobId}): ${(e as Error).message}`,
          (e as Error).stack,
        );
        throw e;
      }
    }
  }

  /**
   * Schedule reminders and return a structured result for each reminder so callers
   * (e.g. the debug "Schedule Now" UI) can see exactly what happened — scheduled,
   * skipped (already passed / disabled / no rule), or failed (with error message).
   */
  async scheduleRemindersWithResult(
    appointmentId: string,
    clinicId: string,
    appointmentDate: Date,
    startTime: string,
  ): Promise<{
    overallStatus: 'ok' | 'no_rule' | 'rule_disabled';
    results: Array<{
      reminderIndex: number;
      reminderHours: number;
      status: 'scheduled' | 'already_scheduled' | 'disabled' | 'already_passed' | 'failed';
      jobId?: string;
      firesAt?: string;
      error?: string;
    }>;
  }> {
    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });
    if (!rule) return { overallStatus: 'no_rule', results: [] };
    if (!rule.is_enabled) return { overallStatus: 'rule_disabled', results: [] };

    const config = (rule.config as Record<string, unknown>) ?? {};
    const reminders = getReminderDefinitions(config);
    const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
    const results: Array<{
      reminderIndex: number;
      reminderHours: number;
      status: 'scheduled' | 'already_scheduled' | 'disabled' | 'already_passed' | 'failed';
      jobId?: string;
      firesAt?: string;
      error?: string;
    }> = [];

    for (const reminder of reminders) {
      if (!reminder.enabled) {
        results.push({ reminderIndex: reminder.index, reminderHours: reminder.hours, status: 'disabled' });
        continue;
      }
      const sendAt = new Date(apptStartUtc.getTime() - reminder.hours * 60 * 60 * 1000);
      const delay = sendAt.getTime() - Date.now();
      if (delay <= 0) {
        results.push({ reminderIndex: reminder.index, reminderHours: reminder.hours, status: 'already_passed', firesAt: sendAt.toISOString() });
        continue;
      }

      const jobId = `appointment-${appointmentId}-reminder-${reminder.index}`;

      // Check if already exists (deterministic ID = idempotent)
      const existing = await this.reminderQueue.getJob(jobId).catch(() => null);
      if (existing) {
        results.push({
          reminderIndex: reminder.index,
          reminderHours: reminder.hours,
          status: 'already_scheduled',
          jobId,
          firesAt: sendAt.toISOString(),
        });
        continue;
      }

      try {
        await this.reminderQueue.add(
          APPOINTMENT_REMINDER_JOB,
          { appointmentId, clinicId, reminderIndex: reminder.index, reminderHours: reminder.hours } satisfies AppointmentReminderJobData,
          { jobId, delay, removeOnComplete: true, removeOnFail: 100 },
        );
        this.logger.log(`[force] Scheduled reminder ${reminder.index} for appointment ${appointmentId} [jobId=${jobId}]`);
        results.push({
          reminderIndex: reminder.index,
          reminderHours: reminder.hours,
          status: 'scheduled',
          jobId,
          firesAt: sendAt.toISOString(),
        });
      } catch (e) {
        const msg = (e as Error).message;
        this.logger.error(`[force] FAILED to enqueue reminder ${reminder.index} for appointment ${appointmentId}: ${msg}`, (e as Error).stack);
        results.push({
          reminderIndex: reminder.index,
          reminderHours: reminder.hours,
          status: 'failed',
          error: msg,
        });
      }
    }

    return { overallStatus: 'ok', results };
  }

  /**
   * Cancel all scheduled reminders for an appointment (on cancellation).
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    for (const idx of [1, 2] as const) {
      const jobId = `appointment-${appointmentId}-reminder-${idx}`;
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

  /**
   * Preview what reminders WOULD be scheduled — does NOT add any jobs to the queue.
   * Used by the debug endpoint.
   */
  async previewReminders(
    appointmentId: string,
    clinicId: string,
    appointmentDate: Date,
    startTime: string,
  ) {
    const now = Date.now();
    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });

    if (!rule) return { status: 'no_rule', reminders: [] };
    if (!rule.is_enabled) return { status: 'rule_disabled', reminders: [] };

    const config = (rule.config as Record<string, unknown>) ?? {};
    const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);

    const reminders = getReminderDefinitions(config).map((r) => {
      const sendAt = new Date(apptStartUtc.getTime() - r.hours * 60 * 60 * 1000);
      const delay = sendAt.getTime() - now;
      return {
        reminderIndex: r.index,
        reminderHours: r.hours,
        enabled: r.enabled,
        wouldFireAt: sendAt.toISOString(),
        wouldFireIn: delay > 0 ? `${Math.round(delay / 60000)} minutes` : null,
        status: !r.enabled ? 'disabled' : delay <= 0 ? 'already_passed' : 'would_schedule',
      };
    });

    return {
      status: 'ok',
      appointmentId,
      appointmentStartUtc: apptStartUtc.toISOString(),
      nowUtc: new Date(now).toISOString(),
      reminders,
    };
  }
}
