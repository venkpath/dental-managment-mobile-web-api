import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import type { AppointmentReminderJobData } from './appointment-reminder.types.js';
import { isReminderEnabled } from './appointment-reminder.config.js';
import { formatDoctorName } from '../../common/utils/name.util.js';
import { AppointmentNotificationService } from './appointment-notification.service.js';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function resolveChannel(
  ruleChannel: string,
  preferred: string | null | undefined,
  settings: {
    enable_whatsapp: boolean;
    enable_sms: boolean;
    enable_email: boolean;
  } | null,
): MessageChannel {
  const toChannel = (v: string): MessageChannel => {
    if (v === 'email') return MessageChannel.EMAIL;
    if (v === 'sms') return MessageChannel.SMS;
    return MessageChannel.WHATSAPP;
  };

  if (ruleChannel !== 'preferred') return toChannel(ruleChannel);

  const pref = preferred ?? 'whatsapp';

  if (settings) {
    if (pref === 'whatsapp' && settings.enable_whatsapp) return MessageChannel.WHATSAPP;
    if (pref === 'sms' && settings.enable_sms) return MessageChannel.SMS;
    if (pref === 'email' && settings.enable_email) return MessageChannel.EMAIL;
    // Fallback to first enabled channel
    if (settings.enable_whatsapp) return MessageChannel.WHATSAPP;
    if (settings.enable_sms) return MessageChannel.SMS;
    if (settings.enable_email) return MessageChannel.EMAIL;
  }

  return toChannel(pref);
}

@Processor(QUEUE_NAMES.APPOINTMENT_REMINDER)
export class AppointmentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly notificationService: AppointmentNotificationService,
  ) {
    super();
  }

  async process(job: Job<AppointmentReminderJobData>): Promise<void> {
    const data = job.data;

    // ── Dentist reminder branch ──
    // Dentist jobs are scheduled independently of patient slots and have
    // their own `appointment_reminder_dentist` rule. We delegate to the
    // notification service which handles role/phone gates, template
    // resolution, and final send.
    if (data.kind === 'dentist') {
      const { appointmentId, clinicId, reminderHours } = data;
      this.logger.log(
        `Processing dentist reminder (${reminderHours}h before) for appointment ${appointmentId}`,
      );

      // Bail out fast if the appointment is no longer scheduled.
      const appt = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, status: true },
      });
      if (!appt) {
        this.logger.warn(`Appointment ${appointmentId} not found — skipping dentist reminder`);
        return;
      }
      if (appt.status !== 'scheduled') {
        this.logger.log(
          `Appointment ${appointmentId} status "${appt.status}" — skipping dentist reminder`,
        );
        return;
      }

      await this.notificationService.sendDentistReminder(clinicId, appointmentId, reminderHours);
      return;
    }

    // ── Patient reminder branch (default) ──
    const { appointmentId, clinicId, reminderIndex, reminderHours } = data;

    this.logger.log(
      `Processing reminder ${reminderIndex} (${reminderHours}h before) for appointment ${appointmentId}`,
    );

    // 1. Load the appointment — bail out if cancelled or not found
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        dentist: { select: { name: true } },
        clinic: { select: { id: true, name: true, phone: true } },
        branch: { select: { name: true } },
      },
    });

    if (!appt) {
      this.logger.warn(`Appointment ${appointmentId} not found — skipping reminder`);
      return;
    }

    if (appt.status !== 'scheduled') {
      this.logger.log(
        `Appointment ${appointmentId} has status "${appt.status}" — skipping reminder`,
      );
      return;
    }

    // 2. Re-read automation rule config to respect any updates since scheduling
    const rule = await this.prisma.automationRule.findUnique({
      where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'appointment_reminder_patient' } },
    });

    if (!rule?.is_enabled) {
      this.logger.log(`appointment_reminder_patient rule disabled for clinic ${clinicId} — skipping`);
      return;
    }

    const config = (rule.config as Record<string, unknown>) ?? {};
    const templateKey = `reminder_${reminderIndex}_template_id`;

    if (!isReminderEnabled(config, reminderIndex, true)) {
      this.logger.log(`Reminder ${reminderIndex} disabled for clinic ${clinicId} — skipping`);
      return;
    }

    const templateId =
      (config[templateKey] as string | null | undefined) ?? rule.template_id ?? undefined;

    // 3. Resolve channel (patient preference + clinic settings)
    const [prefs, settings] = await Promise.all([
      this.prisma.patientCommunicationPreference.findUnique({
        where: { patient_id: appt.patient_id },
        select: { preferred_channel: true },
      }),
      this.prisma.clinicCommunicationSettings.findUnique({
        where: { clinic_id: clinicId },
      }),
    ]);

    const channel = resolveChannel(
      rule.channel,
      prefs?.preferred_channel,
      settings,
    );

    // 4. Build template variables
    const fmtDate = formatDate(appt.appointment_date);
    const fmtTime = formatTime(appt.start_time);
    const clinicPhone = appt.clinic.phone ?? '';

    const timeUntilPhrase =
      reminderHours >= 24
        ? 'tomorrow'
        : reminderHours >= 1
          ? `in ${reminderHours} hour${reminderHours === 1 ? '' : 's'}`
          : `in ${Math.round(reminderHours * 60)} minutes`;

    const isSameDay = reminderHours < 12;
    const dateForTemplate = isSameDay ? 'Today' : fmtDate;
    const timeForTemplate = isSameDay ? `${fmtTime} (${timeUntilPhrase})` : fmtTime;

    // 5. Send the message
    await this.communicationService.sendMessage(clinicId, {
      patient_id: appt.patient_id,
      channel,
      category: MessageCategory.TRANSACTIONAL,
      template_id: templateId,
      body: templateId
        ? undefined
        : `Reminder: You have an appointment ${timeUntilPhrase} at ${fmtTime} with ${formatDoctorName(appt.dentist.name)} at ${appt.clinic.name}.`,
      variables: {
        patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
        patient_first_name: appt.patient.first_name,
        appointment_date: fmtDate,
        date: fmtDate,
        appointment_time: fmtTime,
        time: fmtTime,
        dentist_name: formatDoctorName(appt.dentist.name),
        doctor_name: formatDoctorName(appt.dentist.name),
        clinic_name: appt.clinic.name,
        clinic_phone: clinicPhone,
        phone: clinicPhone,
        time_until: timeUntilPhrase,
        // Numbered keys for Meta templates
        '1': appt.patient.first_name,
        '2': dateForTemplate,
        '3': timeForTemplate,
        '4': appt.clinic.name,
        '5': appt.dentist.name,
        '6': clinicPhone,
      },
      metadata: {
        automation: 'appointment_reminder_patient',
        appointment_id: appt.id,
        reminder_index: reminderIndex,
        reminder_hours: reminderHours,
      },
    });

    this.logger.log(
      `Sent reminder ${reminderIndex} for appointment ${appointmentId} via ${channel}`,
    );
  }
}
