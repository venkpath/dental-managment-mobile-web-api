import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import type { Appointment, Patient, User, Branch } from '@prisma/client';

/**
 * Maps WhatsApp Meta template names to their variable order.
 * Each key = Meta template name, value = ordered list describing
 * what each {{1}}, {{2}}, ... slot expects.
 */
const WHATSAPP_TEMPLATE_VARS: Record<string, string[]> = {
  dental_appointment_confirmation: ['patient_name', 'doctor_name', 'date', 'time', 'clinic_name', 'phone'],
  dental_appointment_reminder:     ['patient_name', 'date', 'time', 'clinic_name', 'doctor_name', 'phone'],
  dental_appointment_cancel:       ['patient_name', 'clinic_name', 'date', 'time', 'phone'],
  dental_appointment_rescheduled:  ['patient_name', 'previous_time', 'new_time', 'clinic_name', 'phone'],
  dental_treatment_followup:       ['patient_name', 'treatment', 'clinic_name', 'phone'],
};

interface AppointmentWithRelations extends Appointment {
  patient: Patient;
  dentist: Pick<User, 'name'>;
  branch: Pick<Branch, 'name' | 'address' | 'map_url' | 'latitude' | 'longitude'>;
  clinic: { id: string; name: string; phone?: string | null };
}

@Injectable()
export class AppointmentNotificationService {
  private readonly logger = new Logger(AppointmentNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) {}

  /**
   * Send appointment confirmation WhatsApp message when a new appointment is created.
   */
  async sendConfirmation(clinicId: string, appointmentId: string): Promise<void> {
    try {
      const appt = await this.loadAppointment(appointmentId);
      if (!appt) return;

      const templateName = 'dental_appointment_confirmation';
      const variables = this.buildVariables(templateName, appt);

      const mapUrl = this.getBranchMapUrl(appt);

      await this.sendWhatsAppTemplate(clinicId, appt.patient_id, templateName, variables, {
        automation: 'appointment_confirmation',
        appointment_id: appointmentId,
        button_url_suffix: mapUrl,
      });

      this.logger.log(`Appointment confirmation sent for ${appointmentId}`);
    } catch (e) {
      this.logger.warn(`Failed to send appointment confirmation for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Send cancellation WhatsApp message when an appointment is cancelled.
   */
  async sendCancellation(clinicId: string, appointmentId: string): Promise<void> {
    try {
      const appt = await this.loadAppointment(appointmentId);
      if (!appt) return;

      const templateName = 'dental_appointment_cancel';
      const variables = this.buildVariables(templateName, appt);
      const mapUrl = this.getBranchMapUrl(appt);

      await this.sendWhatsAppTemplate(clinicId, appt.patient_id, templateName, variables, {
        automation: 'appointment_cancellation',
        appointment_id: appointmentId,
        button_url_suffix: mapUrl,
      });

      this.logger.log(`Appointment cancellation sent for ${appointmentId}`);
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
      const appt = await this.loadAppointment(appointmentId);
      if (!appt) return;

      const templateName = 'dental_appointment_rescheduled';
      const variables = this.buildVariables(templateName, appt, { oldDate, oldTime });
      const mapUrl = this.getBranchMapUrl(appt);

      await this.sendWhatsAppTemplate(clinicId, appt.patient_id, templateName, variables, {
        automation: 'appointment_rescheduled',
        appointment_id: appointmentId,
        button_url_suffix: mapUrl,
      });

      this.logger.log(`Appointment reschedule notification sent for ${appointmentId}`);
    } catch (e) {
      this.logger.warn(`Failed to send appointment reschedule for ${appointmentId}: ${(e as Error).message}`);
    }
  }

  /**
   * Build Google Maps directions URL from branch location data.
   * Used as the dynamic parameter for "Get Directions" URL buttons in WhatsApp templates.
   */
  private getBranchMapUrl(appt: AppointmentWithRelations): string {
    if (appt.branch.map_url) return appt.branch.map_url;
    if (appt.branch.latitude && appt.branch.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${appt.branch.latitude},${appt.branch.longitude}`;
    }
    // Fallback: use address for directions
    if (appt.branch.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(appt.branch.address)}`;
    }
    return '';
  }

  // ─── Private Helpers ───

  private async loadAppointment(appointmentId: string): Promise<AppointmentWithRelations | null> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        dentist: { select: { name: true } },
        branch: { select: { name: true, address: true, map_url: true, latitude: true, longitude: true } },
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

    // Previous time for rescheduled template
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
      new_time: newTime,
      treatment: '',
    };

    // Build numbered variables: { "1": value, "2": value, ... }
    const result: Record<string, string> = {};
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
    // Find the WhatsApp template in DB by name
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: templateName,
        channel: 'whatsapp',
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' }, // clinic templates take priority
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
