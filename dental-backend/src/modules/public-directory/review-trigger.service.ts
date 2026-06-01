import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { randomBytes } from 'crypto';

const APP_BASE_URL = process.env['APP_BASE_URL'] || 'https://smartdentaldesk.com';

// Only send one review request per patient per clinic within this window.
const DEDUP_WINDOW_HOURS = 48;

@Injectable()
export class ReviewTriggerService {
  private readonly logger = new Logger(ReviewTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) {}

  // ── Scenario 1: appointment marked completed ──────────────────────────────
  async triggerPostAppointmentReview(
    clinicId: string,
    appointmentId: string,
    patientId: string,
    dentistId: string,
  ): Promise<void> {
    await this.sendReviewRequest({
      clinicId,
      patientId,
      doctorId: dentistId || null,
      appointmentId,
      source: 'appointment',
    });
  }

  // ── Scenario 2: consultation finalized without a linked appointment ───────
  async triggerConsultationReview(
    clinicId: string,
    patientId: string,
    dentistId: string,
  ): Promise<void> {
    await this.sendReviewRequest({
      clinicId,
      patientId,
      doctorId: dentistId || null,
      appointmentId: null,
      source: 'consultation',
    });
  }

  // ── Scenario 3: invoice issued, no appointment or consultation today ──────
  async triggerInvoiceReview(
    clinicId: string,
    patientId: string,
    dentistId?: string | null,
  ): Promise<void> {
    await this.sendReviewRequest({
      clinicId,
      patientId,
      doctorId: dentistId ?? null,
      appointmentId: null,
      source: 'invoice',
    });
  }

  // ── Core: dedup + create token + send WhatsApp ────────────────────────────
  private async sendReviewRequest(opts: {
    clinicId: string;
    patientId: string;
    doctorId: string | null;
    appointmentId: string | null;
    source: 'appointment' | 'consultation' | 'invoice';
  }): Promise<void> {
    try {
      const { clinicId, patientId, doctorId, appointmentId, source } = opts;

      // Send review requests for ALL clinics — not just directory-listed ones.
      // A clinic may not be listed today but could opt in months or years later;
      // we want the review history already collected for them. Submitted reviews
      // stay hidden (is_visible:false, approval_status:'pending') until the clinic
      // lists and approves them, so this affects data collection only, never
      // public exposure.
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, phone: true },
      });
      if (!clinic) return;

      // Dedup: skip if patient already got a review request within the dedup window
      const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);
      const existing = await this.prisma.clinicDirectoryReview.findFirst({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          created_at: { gte: cutoff },
        },
        select: { id: true },
      });
      if (existing) {
        this.logger.log(`Review request skipped for patient ${patientId} — already sent within ${DEDUP_WINDOW_HOURS}h`);
        return;
      }

      // Also guard: if trigger came from an appointment, avoid double-create
      if (appointmentId) {
        const byAppt = await this.prisma.clinicDirectoryReview.findFirst({
          where: { appointment_id: appointmentId },
          select: { id: true },
        });
        if (byAppt) return;
      }

      // Get patient details
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { first_name: true, id: true },
      });
      if (!patient) return;

      // Create the token row
      const token = randomBytes(32).toString('hex');
      await this.prisma.clinicDirectoryReview.create({
        data: {
          clinic_id: clinicId,
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_id: appointmentId,
          source,
          token,
          reviewer_name: '',
          overall_rating: 0,
          approval_status: 'pending',
          is_visible: false,
        },
      });

      const reviewUrl = `${APP_BASE_URL}/review/${token}`;

      const clinicPhone = clinic.phone ?? '';

      // Look up the pre-approved WhatsApp template.
      // Without template_id, Meta rejects the message as a "re-engagement" attempt
      // whenever the patient's 24-hour session window has expired.
      // Find the approved WhatsApp review template.
      // Priority: clinic-specific approved → clinic-specific active → platform approved → platform active.
      const template = await this.prisma.messageTemplate.findFirst({
        where: {
          template_name: 'review_request_post_visit',
          channel: 'whatsapp',
          is_active: true,
          whatsapp_template_status: 'approved',
          OR: [{ clinic_id: clinicId }, { clinic_id: null }],
        },
        orderBy: { clinic_id: 'desc' },
        select: { id: true },
      }) ?? await this.prisma.messageTemplate.findFirst({
        where: {
          template_name: 'review_request_post_visit',
          channel: 'whatsapp',
          is_active: true,
          OR: [{ clinic_id: clinicId }, { clinic_id: null }],
        },
        orderBy: { clinic_id: 'desc' },
        select: { id: true },
      });

      if (!template) {
        this.logger.warn(
          `WhatsApp template "review_request_post_visit" not found or inactive for clinic ${clinicId}. ` +
          `Go to Communication → WhatsApp Templates, ensure the template exists with that exact name and status is Approved.`,
        );
        return;
      }

      await this.communicationService.sendMessage(clinicId, {
        patient_id: patientId,
        channel: MessageChannel.WHATSAPP,
        category: MessageCategory.TRANSACTIONAL,
        template_id: template.id,
        variables: {
          patient_name: patient.first_name,
          clinic_name: clinic.name,
          review_url: reviewUrl,
          clinic_phone: clinicPhone,
        },
        metadata: { automation: 'post_visit_review', source, appointment_id: appointmentId ?? undefined },
      });

      this.logger.log(`Review request sent — patient ${patientId}, source: ${source}`);
    } catch (e) {
      this.logger.warn(`Review trigger failed: ${(e as Error).message}`);
    }
  }
}
