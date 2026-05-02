import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import type { AppointmentReminderJobData } from './appointment-reminder.types.js';
import { getReminderDefinitions, getDentistReminderDefinition } from './appointment-reminder.config.js';

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

/** Per-slot result row returned by scheduleRemindersWithResult / previewReminders. */
export interface ReminderScheduleResult {
  kind: 'patient' | 'dentist';
  /** Patient-only: 1 or 2. Undefined for dentist. */
  reminderIndex?: 1 | 2;
  reminderHours: number;
  status: 'scheduled' | 'already_scheduled' | 'disabled' | 'already_passed' | 'failed' | 'would_schedule';
  jobId?: string;
  firesAt?: string;
  wouldFireIn?: string | null;
  error?: string;
}

@Injectable()
export class AppointmentReminderProducer {
  private readonly logger = new Logger(AppointmentReminderProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.APPOINTMENT_REMINDER)
    private readonly reminderQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule reminder jobs for an appointment:
   *   • up to 2 patient slots  (`appointment_reminder_patient`)
   *   • 1 dentist slot         (`appointment_reminder_dentist`)
   *
   * The two rule types are independent — disabling patient reminders does
   * not silently disable the dentist nudge, and vice versa. Jobs use
   * deterministic IDs so re-runs are idempotent.
   */
  async scheduleReminders(
    appointmentId: string,
    clinicId: string,
    appointmentDate: Date,
    startTime: string,
  ): Promise<void> {
    const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);

    // ── Patient slots ──
    const patientRule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });

    if (!patientRule) {
      this.logger.warn(`No appointment_reminder_patient rule for clinic ${clinicId} — patient reminders skipped`);
    } else if (!patientRule.is_enabled) {
      this.logger.warn(`appointment_reminder_patient DISABLED for clinic ${clinicId} — patient reminders skipped`);
    } else {
      const config = (patientRule.config as Record<string, unknown>) ?? {};
      const reminders = getReminderDefinitions(config);

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
          kind: 'patient',
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

    // ── Dentist slot (independent of patient rule status) ──
    await this.scheduleDentistReminder(appointmentId, clinicId, apptStartUtc);
  }

  /**
   * Schedule the single dentist reminder job. Reads
   * `appointment_reminder_dentist.config.hours` (default 2) and fires at
   * `appt − hours`. Skipped silently if the rule is missing/disabled or
   * the fire time has already passed.
   */
  private async scheduleDentistReminder(
    appointmentId: string,
    clinicId: string,
    apptStartUtc: Date,
  ): Promise<void> {
    const dentistRule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_dentist' } },
    });

    if (!dentistRule) {
      this.logger.log(`No appointment_reminder_dentist rule for clinic ${clinicId} — dentist reminder skipped`);
      return;
    }
    if (!dentistRule.is_enabled) {
      this.logger.log(`appointment_reminder_dentist DISABLED for clinic ${clinicId} — dentist reminder skipped`);
      return;
    }

    const def = getDentistReminderDefinition((dentistRule.config as Record<string, unknown>) ?? {});
    const sendAt = new Date(apptStartUtc.getTime() - def.hours * 60 * 60 * 1000);
    const delay = sendAt.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.warn(
        `Skipping dentist reminder for appointment ${appointmentId} — fire time ${sendAt.toISOString()} already passed (${def.hours}h before appointment).`,
      );
      return;
    }

    const jobId = `appointment-${appointmentId}-reminder-dentist`;
    const jobData: AppointmentReminderJobData = {
      kind: 'dentist',
      appointmentId,
      clinicId,
      reminderHours: def.hours,
    };

    try {
      await this.reminderQueue.add(APPOINTMENT_REMINDER_JOB, jobData, {
        jobId,
        delay,
        removeOnComplete: true,
        removeOnFail: 100,
      });
      this.logger.log(
        `Scheduled dentist reminder (${def.hours}h before) for appointment ${appointmentId} at ${sendAt.toISOString()} [jobId=${jobId}]`,
      );
    } catch (e) {
      this.logger.error(
        `FAILED to enqueue dentist reminder for appointment ${appointmentId} (jobId=${jobId}): ${(e as Error).message}`,
        (e as Error).stack,
      );
      throw e;
    }
  }

  /**
   * Schedule reminders and return a structured result for each reminder so callers
   * (e.g. the debug "Schedule Now" UI) can see exactly what happened — scheduled,
   * skipped (already passed / disabled / no rule), or failed (with error message).
   *
   * `overallStatus` reflects the patient rule (kept for legacy callers).
   * `results` includes both patient slots AND the dentist slot, each tagged
   * with `kind` so the UI can group them.
   */
  async scheduleRemindersWithResult(
    appointmentId: string,
    clinicId: string,
    appointmentDate: Date,
    startTime: string,
  ): Promise<{
    overallStatus: 'ok' | 'no_rule' | 'rule_disabled';
    results: ReminderScheduleResult[];
  }> {
    const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);
    const results: ReminderScheduleResult[] = [];

    // ── Patient slots ──
    const patientRule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });

    let overallStatus: 'ok' | 'no_rule' | 'rule_disabled' = 'ok';
    if (!patientRule) {
      overallStatus = 'no_rule';
    } else if (!patientRule.is_enabled) {
      overallStatus = 'rule_disabled';
    } else {
      const config = (patientRule.config as Record<string, unknown>) ?? {};
      const reminders = getReminderDefinitions(config);
      for (const reminder of reminders) {
        results.push(
          await this.tryScheduleSlot({
            appointmentId,
            clinicId,
            apptStartUtc,
            kind: 'patient',
            reminderIndex: reminder.index,
            hours: reminder.hours,
            enabled: reminder.enabled,
            jobId: `appointment-${appointmentId}-reminder-${reminder.index}`,
            jobData: {
              kind: 'patient',
              appointmentId,
              clinicId,
              reminderIndex: reminder.index,
              reminderHours: reminder.hours,
            },
          }),
        );
      }
    }

    // ── Dentist slot ──
    const dentistRule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_dentist' } },
    });
    if (dentistRule && dentistRule.is_enabled) {
      const def = getDentistReminderDefinition((dentistRule.config as Record<string, unknown>) ?? {});
      results.push(
        await this.tryScheduleSlot({
          appointmentId,
          clinicId,
          apptStartUtc,
          kind: 'dentist',
          hours: def.hours,
          enabled: true,
          jobId: `appointment-${appointmentId}-reminder-dentist`,
          jobData: {
            kind: 'dentist',
            appointmentId,
            clinicId,
            reminderHours: def.hours,
          },
        }),
      );
    } else if (dentistRule) {
      results.push({ kind: 'dentist', reminderHours: 0, status: 'disabled' });
    }

    return { overallStatus, results };
  }

  /** Internal: schedule one slot (patient or dentist) and return a result row. */
  private async tryScheduleSlot(args: {
    appointmentId: string;
    clinicId: string;
    apptStartUtc: Date;
    kind: 'patient' | 'dentist';
    reminderIndex?: 1 | 2;
    hours: number;
    enabled: boolean;
    jobId: string;
    jobData: AppointmentReminderJobData;
  }): Promise<ReminderScheduleResult> {
    const { kind, reminderIndex, hours, enabled, jobId, apptStartUtc, jobData, appointmentId } = args;
    if (!enabled) return { kind, reminderIndex, reminderHours: hours, status: 'disabled' };

    const sendAt = new Date(apptStartUtc.getTime() - hours * 60 * 60 * 1000);
    const delay = sendAt.getTime() - Date.now();
    if (delay <= 0) {
      return {
        kind, reminderIndex, reminderHours: hours,
        status: 'already_passed', firesAt: sendAt.toISOString(),
      };
    }

    const existing = await this.reminderQueue.getJob(jobId).catch(() => null);
    if (existing) {
      return {
        kind, reminderIndex, reminderHours: hours,
        status: 'already_scheduled', jobId, firesAt: sendAt.toISOString(),
      };
    }

    try {
      await this.reminderQueue.add(APPOINTMENT_REMINDER_JOB, jobData, {
        jobId, delay, removeOnComplete: true, removeOnFail: 100,
      });
      this.logger.log(`[force] Scheduled ${kind} reminder${reminderIndex ? ' ' + reminderIndex : ''} for appointment ${appointmentId} [jobId=${jobId}]`);
      return {
        kind, reminderIndex, reminderHours: hours,
        status: 'scheduled', jobId, firesAt: sendAt.toISOString(),
      };
    } catch (e) {
      const msg = (e as Error).message;
      this.logger.error(`[force] FAILED to enqueue ${kind} reminder for appointment ${appointmentId}: ${msg}`, (e as Error).stack);
      return { kind, reminderIndex, reminderHours: hours, status: 'failed', error: msg };
    }
  }

  /**
   * Cancel all scheduled reminders for an appointment (on cancellation).
   * Drops both patient slots (1, 2) and the dentist slot.
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    const slotIds: string[] = [
      `appointment-${appointmentId}-reminder-1`,
      `appointment-${appointmentId}-reminder-2`,
      `appointment-${appointmentId}-reminder-dentist`,
    ];
    for (const jobId of slotIds) {
      const job = await this.reminderQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled ${jobId}`);
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
   * Preview what reminders WOULD be scheduled — does NOT add any jobs to
   * the queue. Used by the debug endpoint. Includes patient slots and the
   * dentist slot, each tagged with `kind`.
   *
   * `status: 'no_rule'` reflects the patient rule for backwards compat;
   * the dentist rule is reported per-row inside `reminders`.
   */
  async previewReminders(
    appointmentId: string,
    clinicId: string,
    appointmentDate: Date,
    startTime: string,
  ) {
    const now = Date.now();
    const apptStartUtc = appointmentStartUtc(appointmentDate, startTime);

    const [patientRule, dentistRule] = await Promise.all([
      this.prisma.automationRule.findUnique({
        where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
      }),
      this.prisma.automationRule.findUnique({
        where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_dentist' } },
      }),
    ]);

    const reminders: ReminderScheduleResult[] = [];

    if (patientRule?.is_enabled) {
      const config = (patientRule.config as Record<string, unknown>) ?? {};
      for (const r of getReminderDefinitions(config)) {
        const sendAt = new Date(apptStartUtc.getTime() - r.hours * 60 * 60 * 1000);
        const delay = sendAt.getTime() - now;
        reminders.push({
          kind: 'patient',
          reminderIndex: r.index,
          reminderHours: r.hours,
          firesAt: sendAt.toISOString(),
          wouldFireIn: delay > 0 ? `${Math.round(delay / 60000)} minutes` : null,
          status: !r.enabled ? 'disabled' : delay <= 0 ? 'already_passed' : 'would_schedule',
        });
      }
    }

    if (dentistRule?.is_enabled) {
      const def = getDentistReminderDefinition((dentistRule.config as Record<string, unknown>) ?? {});
      const sendAt = new Date(apptStartUtc.getTime() - def.hours * 60 * 60 * 1000);
      const delay = sendAt.getTime() - now;
      reminders.push({
        kind: 'dentist',
        reminderHours: def.hours,
        firesAt: sendAt.toISOString(),
        wouldFireIn: delay > 0 ? `${Math.round(delay / 60000)} minutes` : null,
        status: delay <= 0 ? 'already_passed' : 'would_schedule',
      });
    } else if (dentistRule) {
      reminders.push({ kind: 'dentist', reminderHours: 0, status: 'disabled' });
    }

    const status =
      !patientRule ? 'no_rule'
      : !patientRule.is_enabled ? 'rule_disabled'
      : 'ok';

    return {
      status,
      appointmentId,
      appointmentStartUtc: apptStartUtc.toISOString(),
      nowUtc: new Date(now).toISOString(),
      reminders,
    };
  }
}
