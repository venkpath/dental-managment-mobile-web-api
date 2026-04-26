import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiOkResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';
import { UserRole } from '../user/dto/index.js';
import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';
import { UpsertAutomationRuleDto } from './dto/index.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { PrismaService } from '../../database/prisma.service.js';
import { getReminderDefinitions } from '../appointment/appointment-reminder.config.js';

@ApiTags('Automation Rules')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('AUTOMATION_RULES')
@Controller('automation/rules')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly automationCronService: AutomationCronService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.APPOINTMENT_REMINDER) private readonly reminderQueue: Queue,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all automation rules for the clinic (creates defaults on first access)' })
  @ApiOkResponse({ description: 'List of automation rules with enable/disable status and config' })
  async getAllRules(@CurrentClinic() clinicId: string) {
    return this.automationService.getAllRules(clinicId);
  }

  @Get(':ruleType')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a specific automation rule' })
  async getRule(
    @CurrentClinic() clinicId: string,
    @Param('ruleType') ruleType: string,
  ) {
    return this.automationService.getRule(clinicId, ruleType);
  }

  @Patch(':ruleType')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enable/disable or configure an automation rule' })
  async upsertRule(
    @CurrentClinic() clinicId: string,
    @Param('ruleType') ruleType: string,
    @Body() dto: UpsertAutomationRuleDto,
  ) {
    return this.automationService.upsertRule(clinicId, ruleType, dto);
  }

  // ─── Manual Cron Triggers (for testing) ───

  @Post('trigger-crons')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger all automation crons (birthday, festival, appointment, payment, dormant, treatment)' })
  async triggerCrons() {
    const results: Record<string, string> = {};

    const jobs = [
      { name: 'birthdayGreetings', fn: () => this.automationCronService.birthdayGreetings() },
      { name: 'festivalGreetings', fn: () => this.automationCronService.festivalGreetings() },
      { name: 'paymentReminders', fn: () => this.automationCronService.paymentReminders() },
      { name: 'dormantPatientDetection', fn: () => this.automationCronService.dormantPatientDetection() },
      { name: 'treatmentPlanReminders', fn: () => this.automationCronService.treatmentPlanReminders() },
    ];

    for (const job of jobs) {
      try {
        await job.fn();
        results[job.name] = 'success';
      } catch (e) {
        results[job.name] = `error: ${(e as Error).message}`;
      }
    }

    return { message: 'Automation crons triggered manually', results };
  }

  @Post('trigger/:jobName')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a single automation cron job by name' })
  async triggerSingleCron(@Param('jobName') jobName: string) {
    const jobMap: Record<string, () => Promise<void>> = {
      birthdayGreetings: () => this.automationCronService.birthdayGreetings(),
      festivalGreetings: () => this.automationCronService.festivalGreetings(),
      paymentReminders: () => this.automationCronService.paymentReminders(),
      dormantPatientDetection: () => this.automationCronService.dormantPatientDetection(),
      treatmentPlanReminders: () => this.automationCronService.treatmentPlanReminders(),
    };

    const fn = jobMap[jobName];
    if (!fn) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Unknown job: ${jobName}. Valid jobs: ${Object.keys(jobMap).join(', ')}`,
      );
    }

    try {
      await fn();
      return { job: jobName, status: 'success' };
    } catch (e) {
      return { job: jobName, status: 'error', error: (e as Error).message };
    }
  }

  // ─── Appointment Reminder Queue Inspector ───

  @Get('queues/appointment-reminders')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Inspect appointment reminder jobs in the BullMQ queue' })
  async inspectReminderQueue() {
    const now = Date.now();

    const [delayed, waiting, active, failed, completed] = await Promise.all([
      this.reminderQueue.getDelayed(),
      this.reminderQueue.getWaiting(),
      this.reminderQueue.getActive(),
      this.reminderQueue.getFailed(),
      this.reminderQueue.getCompleted(),
    ]);

    return {
      counts: {
        delayed: delayed.length,
        waiting: waiting.length,
        active: active.length,
        failed: failed.length,
        completed: completed.length,
      },
      delayed: delayed.map((j) => ({
        jobId: j.id,
        appointmentId: (j.data as Record<string, unknown>)['appointmentId'],
        reminderIndex: (j.data as Record<string, unknown>)['reminderIndex'],
        reminderHours: (j.data as Record<string, unknown>)['reminderHours'],
        firesAt: new Date(now + (j.delay ?? 0)).toISOString(),
        firesIn: `${Math.round((j.delay ?? 0) / 60000)} minutes`,
      })),
      active: active.map((j) => ({
        jobId: j.id,
        appointmentId: (j.data as Record<string, unknown>)['appointmentId'],
        reminderIndex: (j.data as Record<string, unknown>)['reminderIndex'],
        reminderHours: (j.data as Record<string, unknown>)['reminderHours'],
      })),
      failed: failed.map((j) => ({
        jobId: j.id,
        appointmentId: (j.data as Record<string, unknown>)['appointmentId'],
        reminderIndex: (j.data as Record<string, unknown>)['reminderIndex'],
        reminderHours: (j.data as Record<string, unknown>)['reminderHours'],
        error: j.failedReason,
        attemptsMade: j.attemptsMade,
      })),
      completed: completed.slice(0, 20).map((j) => ({
        jobId: j.id,
        appointmentId: (j.data as Record<string, unknown>)['appointmentId'],
        reminderIndex: (j.data as Record<string, unknown>)['reminderIndex'],
        reminderHours: (j.data as Record<string, unknown>)['reminderHours'],
      })),
    };
  }

  @Post('queues/appointment-reminders/:jobId/retry')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retry a failed appointment reminder job' })
  async retryReminderJob(@Param('jobId') jobId: string) {
    const job = await this.reminderQueue.getJob(jobId);
    if (!job) return { success: false, error: `Job ${jobId} not found` };
    await job.retry();
    return { success: true, jobId };
  }

  @Get('queues/appointment-reminders/debug/:appointmentId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Preview what reminders would be/were scheduled for a specific appointment' })
  async debugReminderSchedule(
    @CurrentClinic() clinicId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, appointment_date: true, start_time: true, status: true, clinic_id: true },
    });

    if (!appointment) return { error: `Appointment ${appointmentId} not found` };
    if (appointment.clinic_id !== clinicId) return { error: 'Appointment does not belong to this clinic' };

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const dateStr = appointment.appointment_date.toISOString().split('T')[0];
    const naiveUtc = new Date(`${dateStr}T${appointment.start_time}:00Z`);
    const apptStartUtc = new Date(naiveUtc.getTime() - IST_OFFSET_MS);
    const now = Date.now();

    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });
    const config = (rule?.config as Record<string, unknown>) ?? {};
    const preview = !rule
      ? { status: 'no_rule', reminders: [] }
      : !rule.is_enabled
        ? { status: 'rule_disabled', reminders: [] }
        : {
            status: 'ok',
            appointmentStartUtc: apptStartUtc.toISOString(),
            nowUtc: new Date(now).toISOString(),
            reminders: getReminderDefinitions(config).map((r) => {
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
            }),
          };

    const [queuedJob1, queuedJob2] = await Promise.all([
      this.reminderQueue.getJob(`appointment-${appointmentId}-reminder-1`),
      this.reminderQueue.getJob(`appointment-${appointmentId}-reminder-2`),
    ]);

    return {
      appointment: {
        id: appointment.id,
        date: appointment.appointment_date,
        startTime: appointment.start_time,
        status: appointment.status,
      },
      preview,
      actualQueuedJobs: [
        queuedJob1 ? { jobId: queuedJob1.id, state: await queuedJob1.getState(), firesAt: new Date(Date.now() + (queuedJob1.delay ?? 0)).toISOString() } : null,
        queuedJob2 ? { jobId: queuedJob2.id, state: await queuedJob2.getState(), firesAt: new Date(Date.now() + (queuedJob2.delay ?? 0)).toISOString() } : null,
      ].filter(Boolean),
    };
  }

  @Post('queues/appointment-reminders/schedule-now/:appointmentId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Force-schedule reminders for an appointment NOW and return per-reminder enqueue results (success/failure with error)' })
  async forceScheduleReminders(
    @CurrentClinic() clinicId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, appointment_date: true, start_time: true, clinic_id: true },
    });
    if (!appointment) return { error: `Appointment ${appointmentId} not found` };
    if (appointment.clinic_id !== clinicId) return { error: 'Appointment does not belong to this clinic' };

    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });
    if (!rule) return { overallStatus: 'no_rule', results: [] };
    if (!rule.is_enabled) return { overallStatus: 'rule_disabled', results: [] };

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const dateStr = appointment.appointment_date.toISOString().split('T')[0];
    const apptStartUtc = new Date(new Date(`${dateStr}T${appointment.start_time}:00Z`).getTime() - IST_OFFSET_MS);
    const config = (rule.config as Record<string, unknown>) ?? {};
    const reminders = getReminderDefinitions(config);

    const results: Array<{
      reminderIndex: number;
      reminderHours: number;
      status: 'scheduled' | 'already_scheduled' | 'disabled' | 'already_passed' | 'failed';
      jobId?: string;
      firesAt?: string;
      error?: string;
    }> = [];

    for (const r of reminders) {
      if (!r.enabled) {
        results.push({ reminderIndex: r.index, reminderHours: r.hours, status: 'disabled' });
        continue;
      }
      const sendAt = new Date(apptStartUtc.getTime() - r.hours * 60 * 60 * 1000);
      const delay = sendAt.getTime() - Date.now();
      if (delay <= 0) {
        results.push({ reminderIndex: r.index, reminderHours: r.hours, status: 'already_passed', firesAt: sendAt.toISOString() });
        continue;
      }
      const jobId = `appointment-${appointmentId}-reminder-${r.index}`;
      const existing = await this.reminderQueue.getJob(jobId).catch(() => null);
      if (existing) {
        results.push({ reminderIndex: r.index, reminderHours: r.hours, status: 'already_scheduled', jobId, firesAt: sendAt.toISOString() });
        continue;
      }
      try {
        await this.reminderQueue.add(
          'send-appointment-reminder',
          { appointmentId, clinicId, reminderIndex: r.index, reminderHours: r.hours },
          { jobId, delay, removeOnComplete: true, removeOnFail: 100 },
        );
        results.push({ reminderIndex: r.index, reminderHours: r.hours, status: 'scheduled', jobId, firesAt: sendAt.toISOString() });
      } catch (e) {
        results.push({ reminderIndex: r.index, reminderHours: r.hours, status: 'failed', error: (e as Error).message });
      }
    }

    return { overallStatus: 'ok', appointmentId, results };
  }
}
