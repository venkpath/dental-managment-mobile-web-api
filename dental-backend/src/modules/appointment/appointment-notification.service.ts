import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import type { AutomationRuleType } from '../automation/dto/upsert-automation-rule.dto.js';
import type { Appointment, Patient, User, Branch } from '@prisma/client';
import { formatDoctorName, stripDoctorPrefix } from '../../common/utils/name.util.js';

/**
 * Maps WhatsApp Meta template names to their variable order.
 * Each key = Meta template name, value = ordered list describing
 * what each {{1}}, {{2}}, ... slot expects.
 */
const WHATSAPP_TEMPLATE_VARS: Record<string, string[]> = {
  // {{1}} patient_name  {{2}} doctor_name  {{3}} date  {{4}} time  {{5}} clinic_name  {{6}} phone
  dental_appointment_confirmation: ['patient_name', 'doctor_name', 'date', 'time', 'clinic_name', 'phone'],
  // {{1}} patient_name  {{2}} date  {{3}} time  {{4}} clinic_name  {{5}} doctor_name  {{6}} phone
  dental_appointment_reminder:     ['patient_name', 'date', 'time', 'clinic_name', 'doctor_name', 'phone'],
  // {{1}} patient_name  {{2}} clinic_name  {{3}} date  {{4}} time  {{5}} phone
  dental_appointment_cancel:       ['patient_name', 'clinic_name', 'date', 'time', 'phone'],
  // {{1}} patient_name  {{2}} previous_time  {{3}} new_time  {{4}} clinic_name  {{5}} phone
  dental_appointment_rescheduled:  ['patient_name', 'previous_time', 'new_time', 'clinic_name', 'phone'],
  // ── Dentist-side templates (sent to the consultant) ──
  // {{1}} doctor_name  {{2}} patient_name  {{3}} date  {{4}} time  {{5}} treatment
  dental_appointment_confirmation_dentist: ['doctor_name', 'patient_name', 'date', 'time', 'treatment'],
  // {{1}} doctor_name  {{2}} patient_name  {{3}} time (with bracketed countdown)  {{4}} treatment
  dental_appointment_reminder_dentist:     ['doctor_name', 'patient_name', 'time', 'treatment'],
};

/** Maps automation rule types to their default (fallback) template names */
const RULE_TO_DEFAULT_TEMPLATE: Record<string, string> = {
  appointment_confirmation: 'dental_appointment_confirmation',
  appointment_cancellation: 'dental_appointment_cancel',
  appointment_rescheduled:  'dental_appointment_rescheduled',
  appointment_confirmation_dentist: 'dental_appointment_confirmation_dentist',
  appointment_reminder_dentist:     'dental_appointment_reminder_dentist',
};

interface AppointmentWithRelations extends Appointment {
  patient: Patient;
  dentist: Pick<User, 'name' | 'phone' | 'role'>;
  branch: Pick<Branch, 'name' | 'address' | 'map_url' | 'latitude' | 'longitude' | 'book_now_url'>;
  clinic: { id: string; name: string; phone?: string | null };
}

@Injectable()
export class AppointmentNotificationService {
  private readonly logger = new Logger(AppointmentNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
  ) {}

  /**
   * Send appointment confirmation notification when a new appointment is created.
   */
  async sendConfirmation(clinicId: string, appointmentId: string): Promise<void> {
    try {
      await this.sendNotification(clinicId, appointmentId, 'appointment_confirmation');
    } catch (e) {
      this.logger.warn(`Failed to send appointment confirmation for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Send cancellation notification when an appointment is cancelled.
   */
  async sendCancellation(clinicId: string, appointmentId: string): Promise<void> {
    try {
      await this.sendNotification(clinicId, appointmentId, 'appointment_cancellation');
    } catch (e) {
      this.logger.warn(`Failed to send appointment cancellation for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Send a WhatsApp confirmation to the dentist (consultant) when a new
   * appointment is booked with them. Gated by the
   * `appointment_confirmation_dentist` automation rule.
   */
  async sendDentistConfirmation(clinicId: string, appointmentId: string): Promise<void> {
    try {
      await this.sendDentistNotification(clinicId, appointmentId, 'appointment_confirmation_dentist');
    } catch (e) {
      this.logger.warn(`Failed to send dentist confirmation for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Send a WhatsApp reminder to the dentist (consultant) ahead of an
   * upcoming appointment. Gated by the `appointment_reminder_dentist`
   * automation rule.
   *
   * @param hoursUntil hours remaining until the appointment (used to
   *                   render the `time_until` slot in the template).
   */
  async sendDentistReminder(
    clinicId: string,
    appointmentId: string,
    hoursUntil: number,
  ): Promise<void> {
    try {
      await this.sendDentistNotification(
        clinicId,
        appointmentId,
        'appointment_reminder_dentist',
        { hoursUntil },
      );
    } catch (e) {
      this.logger.warn(`Failed to send dentist reminder for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Send reschedule notification when an appointment's date/time changes.
   */
  async sendReschedule(
    clinicId: string,
    appointmentId: string,
    oldDate: string,
    oldTime: string,
  ): Promise<void> {
    try {
      await this.sendNotification(clinicId, appointmentId, 'appointment_rescheduled', { oldDate, oldTime });
    } catch (e) {
      this.logger.warn(`Failed to send appointment reschedule for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  // ─── Private Helpers ───

  /**
   * Core notification sender. Checks automation rules for enable/disable and template override.
   */
  private async sendNotification(
    clinicId: string,
    appointmentId: string,
    ruleType: AutomationRuleType,
    extra?: { oldDate?: string; oldTime?: string },
  ): Promise<void> {
    // Plan gate: appointment confirmation/cancellation/reschedule messages require APPOINTMENT_CONFIRMATIONS
    // feature. Free plan doesn't have it; other plans do.
    if (!(await this.clinicHasFeature(clinicId, 'APPOINTMENT_CONFIRMATIONS'))) {
      this.logger.log(`APPOINTMENT_CONFIRMATIONS not enabled for clinic ${clinicId} — skipping ${ruleType}`);
      return;
    }

    const { skip, templateId } = await this.resolveTemplate(clinicId, ruleType);
    if (skip) {
      this.logger.log(`${ruleType} disabled for clinic ${clinicId} — skipping`);
      return;
    }

    const appt = await this.loadAppointment(appointmentId);
    if (!appt) return;

    const defaultTemplateName = RULE_TO_DEFAULT_TEMPLATE[ruleType];
    const variables = this.buildVariables(defaultTemplateName, appt, extra);

    const metadata = { automation: ruleType, appointment_id: appointmentId };

    // Keep existing WhatsApp behavior (rule override template_id takes priority)
    if (templateId) {
      await this.communicationService.sendMessage(clinicId, {
        patient_id: appt.patient_id,
        channel: MessageChannel.WHATSAPP,
        category: MessageCategory.TRANSACTIONAL,
        template_id: templateId,
        variables,
        metadata,
      });
    } else {
      await this.sendTemplateByName(clinicId, appt.patient_id, MessageChannel.WHATSAPP, defaultTemplateName, variables, metadata);
    }

    this.logger.log(`${ruleType} notification sent for ${appointmentId}`);
  }

  /**
   * Core dentist-side notification sender. Sends a WhatsApp template to the
   * dentist's own phone number (not the patient). Gated by the matching
   * `*_dentist` automation rule. Bypasses APPOINTMENT_CONFIRMATIONS plan
   * gate because staff alerts are an internal workflow.
   */
  private async sendDentistNotification(
    clinicId: string,
    appointmentId: string,
    ruleType: AutomationRuleType,
    extra?: { hoursUntil?: number },
  ): Promise<void> {
    const { skip, templateId } = await this.resolveTemplate(clinicId, ruleType);
    if (skip) {
      this.logger.log(`${ruleType} disabled for clinic ${clinicId} — skipping`);
      return;
    }

    const appt = await this.loadAppointment(appointmentId);
    if (!appt) return;

    // Reminders go to both Dentists and Consultants — they may be moving
    // between rooms/clinics and benefit from a heads-up.
    if (ruleType === 'appointment_reminder_dentist') {
      const role = (appt.dentist.role ?? '').trim().toLowerCase();
      if (role !== 'consultant' && role !== 'dentist') {
        this.logger.log(
          `${ruleType} skipped for ${appointmentId} — assignee role "${appt.dentist.role}" is not a clinical role`,
        );
        return;
      }
    }

    const dentistPhone = appt.dentist.phone?.trim();
    if (!dentistPhone) {
      this.logger.log(
        `${ruleType} skipped for ${appointmentId} — dentist has no phone on file`,
      );
      return;
    }

    // Resolve template name. Admin override on the rule wins, otherwise
    // fall back to the hardcoded default. Mirrors the patient flow where
    // rule.template_id overrides RULE_TO_DEFAULT_TEMPLATE. The override is
    // only honoured for active WhatsApp templates — anything else falls
    // back so a stale rule.template_id can't silently break the send.
    let templateName = RULE_TO_DEFAULT_TEMPLATE[ruleType];
    if (templateId) {
      const override = await this.prisma.messageTemplate.findUnique({
        where: { id: templateId },
        select: { template_name: true, channel: true, is_active: true },
      });
      if (override && override.is_active && override.channel === 'whatsapp') {
        templateName = override.template_name;
      } else {
        this.logger.warn(
          `${ruleType} template override ${templateId} not usable (missing / inactive / non-whatsapp) — falling back to default`,
        );
      }
    }
    if (!templateName) {
      this.logger.warn(`No default template mapped for rule ${ruleType}`);
      return;
    }

    const namedVars = this.buildDentistVariables(appt, extra);
    const metadata = {
      automation: ruleType,
      appointment_id: appointmentId,
      dentist_id: appt.dentist_id,
    };

    await this.communicationService.sendStaffWhatsAppTemplate(
      clinicId,
      dentistPhone,
      templateName,
      namedVars,
      metadata,
    );

    this.logger.log(`${ruleType} sent for appointment ${appointmentId} → ${dentistPhone} (template=${templateName})`);
  }

  /** Build the named-variable map for dentist-side templates. */
  private buildDentistVariables(
    appt: AppointmentWithRelations,
    extra?: { hoursUntil?: number },
  ): Record<string, string> {
    const patientName = `${appt.patient.first_name} ${appt.patient.last_name}`;
    const date = this.formatDate(appt.appointment_date);
    const baseTime = this.formatTime(appt.start_time);
    // Approved Meta template begins with literal "Hello Dr. " so we pass
    // just the bare name (no "Dr." prefix) to avoid "Dr. Dr. Priya".
    const doctorName = stripDoctorPrefix(appt.dentist.name) || (appt.dentist.name ?? '');
    const clinicName = appt.clinic.name;

    // Treatment slot: pull from appointment notes if present, otherwise
    // fall back to a generic value so the Meta template variable never
    // ends up empty (which would fail Meta's parameter validation).
    const treatment = (appt.notes?.trim() || 'Consultation').slice(0, 60);

    // For reminders, embed the time-left in brackets next to the time so
    // the dentist sees urgency at a glance, e.g. "10:30 AM (in 30 min)".
    const time = extra?.hoursUntil !== undefined
      ? `${baseTime} (${this.formatTimeUntil(extra.hoursUntil)})`
      : baseTime;

    return {
      doctor_name: doctorName,
      patient_name: patientName,
      date,
      time,
      clinic_name: clinicName,
      treatment,
      time_until: this.formatTimeUntil(extra?.hoursUntil),
    };
  }

  /** Render hours-until-appointment as a human phrase for the template. */
  private formatTimeUntil(hoursUntil?: number): string {
    if (hoursUntil === undefined || hoursUntil === null) return '';
    if (hoursUntil <= 0) return 'soon';
    if (hoursUntil < 1) {
      const mins = Math.max(1, Math.round(hoursUntil * 60));
      return `in ${mins} min`;
    }
    if (hoursUntil >= 23 && hoursUntil <= 25) return 'tomorrow';
    if (hoursUntil < 24) {
      const h = Math.round(hoursUntil);
      return `in ${h} hour${h === 1 ? '' : 's'}`;
    }
    const days = Math.round(hoursUntil / 24);
    return `in ${days} day${days === 1 ? '' : 's'}`;
  }

  private async clinicHasFeature(clinicId: string, featureKey: string): Promise<boolean> {
    const match = await this.prisma.planFeature.findFirst({
      where: {
        is_enabled: true,
        plan: { clinics: { some: { id: clinicId } } },
        feature: { key: featureKey },
      },
      select: { id: true },
    });
    return !!match;
  }

  /**
   * Resolve the template for a notification type from automation rules.
   * Returns { skip: true } if the rule is disabled, or { templateId } if configured.
   */
  private async resolveTemplate(
    clinicId: string,
    ruleType: AutomationRuleType,
  ): Promise<{ skip: boolean; templateId: string | null }> {
    try {
      const rule = await this.automationService.getRuleConfig(clinicId, ruleType);
      if (!rule) {
        return { skip: false, templateId: null };
      }
      if (!rule.is_enabled) {
        return { skip: true, templateId: null };
      }
      return { skip: false, templateId: rule.template_id };
    } catch {
      return { skip: false, templateId: null };
    }
  }

  private async loadAppointment(appointmentId: string): Promise<AppointmentWithRelations | null> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        dentist: { select: { name: true, phone: true, role: true } },
        branch: { select: { name: true, address: true, map_url: true, latitude: true, longitude: true, book_now_url: true } },
        clinic: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!appt) {
      this.logger.warn(`Appointment ${appointmentId} not found for notification`);
      return null;
    }

    return appt as AppointmentWithRelations;
  }

  /**
   * Build ordered variables for a WhatsApp Meta template.
   * Returns a Record<string, string> where keys are "1", "2", "3" etc.
   */
  private buildVariables(
    templateName: string,
    appt: AppointmentWithRelations,
    extra?: { oldDate?: string; oldTime?: string },
  ): Record<string, string> {
    const varOrder = WHATSAPP_TEMPLATE_VARS[templateName];
    if (!varOrder) return {};

    const patientName = `${appt.patient.first_name} ${appt.patient.last_name}`;
    const date = this.formatDate(appt.appointment_date);
    const time = this.formatTime(appt.start_time);
    const clinicName = appt.clinic.name;
    const doctorName = formatDoctorName(appt.dentist.name);
    const phone = appt.clinic.phone || '';

    const previousTime = extra?.oldDate && extra?.oldTime
      ? `${extra.oldDate} ${this.formatTime(extra.oldTime)}`
      : '';
    const newTime = `${date} ${time}`;

    const valueMap: Record<string, string> = {
      patient_name: patientName,
      doctor_name: doctorName,
      date,
      time,
      clinic_name: clinicName,
      phone,
      previous_time: previousTime,
      new_time: newTime,  // "15 Jan 2026 10:30 AM"
      new_date: date,     // just the date part for rescheduled
      treatment: '',
    };

    // Build BOTH numbered keys (for Meta API) AND named keys (for body rendering in dashboard).
    const result: Record<string, string> = { ...valueMap };
    varOrder.forEach((varName, index) => {
      result[String(index + 1)] = valueMap[varName] || '';
    });

    return result;
  }

  /**
   * Send a template-based message via the communication service.
   * Finds the template by name + channel in the DB and passes variables.
   */
  private async sendTemplateByName(
    clinicId: string,
    patientId: string,
    channel: MessageChannel,
    templateName: string,
    variables: Record<string, string>,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: templateName,
        channel,
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' },
    });

    if (!template) {
      this.logger.warn(`${channel} template "${templateName}" not found or not active — skipping notification`);
      return;
    }

    await this.communicationService.sendMessage(clinicId, {
      patient_id: patientId,
      channel,
      category: MessageCategory.TRANSACTIONAL,
      template_id: template.id,
      variables,
      metadata,
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
  }
}
