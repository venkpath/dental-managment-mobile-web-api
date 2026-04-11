import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import type { AutomationRuleType } from '../automation/dto/upsert-automation-rule.dto.js';
import type { Appointment, Patient, User, Branch } from '@prisma/client';

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
};

/** Maps automation rule types to their default (fallback) template names */
const RULE_TO_DEFAULT_TEMPLATE: Record<string, string> = {
  appointment_confirmation: 'dental_appointment_confirmation',
  appointment_cancellation: 'dental_appointment_cancel',
  appointment_rescheduled:  'dental_appointment_rescheduled',
};

interface AppointmentWithRelations extends Appointment {
  patient: Patient;
  dentist: Pick<User, 'name'>;
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
   * Send appointment confirmation WhatsApp message when a new appointment is created.
   */
  async sendConfirmation(clinicId: string, appointmentId: string): Promise<void> {
    try {
      await this.sendNotification(clinicId, appointmentId, 'appointment_confirmation');
    } catch (e) {
      this.logger.warn(`Failed to send appointment confirmation for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Send cancellation WhatsApp message when an appointment is cancelled.
   */
  async sendCancellation(clinicId: string, appointmentId: string): Promise<void> {
    try {
      await this.sendNotification(clinicId, appointmentId, 'appointment_cancellation');
    } catch (e) {
      this.logger.warn(`Failed to send appointment cancellation for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Send reschedule WhatsApp message when an appointment's date/time changes.
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
    const { skip, templateId } = await this.resolveTemplate(clinicId, ruleType);
    if (skip) {
      this.logger.log(`${ruleType} disabled for clinic ${clinicId} — skipping`);
      return;
    }

    const appt = await this.loadAppointment(appointmentId);
    if (!appt) return;

    const defaultTemplateName = RULE_TO_DEFAULT_TEMPLATE[ruleType];
    const variables = this.buildVariables(defaultTemplateName, appt, extra);

    if (templateId) {
      // Use the template configured in the automation rule
      await this.communicationService.sendMessage(clinicId, {
        patient_id: appt.patient_id,
        channel: MessageChannel.WHATSAPP,
        category: MessageCategory.TRANSACTIONAL,
        template_id: templateId,
        variables,
        metadata: { automation: ruleType, appointment_id: appointmentId },
      });
    } else {
      // Fallback: lookup template by name
      await this.sendWhatsAppTemplate(clinicId, appt.patient_id, defaultTemplateName, variables, {
        automation: ruleType,
        appointment_id: appointmentId,
      });
    }

    this.logger.log(`${ruleType} notification sent for ${appointmentId}`);
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
        dentist: { select: { name: true } },
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
    const doctorName = appt.dentist.name;
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
   * Send a WhatsApp template message via the communication service.
   * Finds the template by name in the DB and passes ordered variables.
   */
  private async sendWhatsAppTemplate(
    clinicId: string,
    patientId: string,
    templateName: string,
    variables: Record<string, string>,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: templateName,
        channel: 'whatsapp',
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' },
    });

    if (!template) {
      this.logger.warn(`WhatsApp template "${templateName}" not found or not active — skipping notification`);
      return;
    }

    await this.communicationService.sendMessage(clinicId, {
      patient_id: patientId,
      channel: MessageChannel.WHATSAPP,
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
