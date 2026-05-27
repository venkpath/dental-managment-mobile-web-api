import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { randomBytes } from 'crypto';

const APP_BASE_URL = process.env['APP_BASE_URL'] || 'https://smartdentaldesk.com';

@Injectable()
export class ReviewTriggerService {
  private readonly logger = new Logger(ReviewTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) {}

  /**
   * Called after an appointment is marked completed.
   * Creates a one-time review token and sends a WhatsApp link to the patient.
   * Fire-and-forget — errors are logged but not propagated.
   */
  async triggerPostAppointmentReview(
    clinicId: string,
    appointmentId: string,
    patientId: string,
    dentistId: string,
  ): Promise<void> {
    try {
      // Only trigger for clinics opted into the public directory
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { listed_in_directory: true, name: true },
      });
      if (!clinic?.listed_in_directory) return;

      // Check if a review token was already created for this appointment
      const existing = await this.prisma.clinicDirectoryReview.findFirst({
        where: { appointment_id: appointmentId },
      });
      if (existing) return;

      // Create the token row (reviewer_name and overall_rating filled in when patient submits)
      const token = randomBytes(32).toString('hex');
      await this.prisma.clinicDirectoryReview.create({
        data: {
          clinic_id: clinicId,
          doctor_id: dentistId || null,
          appointment_id: appointmentId,
          token,
          reviewer_name: '',
          overall_rating: 0,
        },
      });

      const reviewUrl = `${APP_BASE_URL}/review/${token}`;

      // Get patient details for the message
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { first_name: true, id: true },
      });

      if (!patient) return;

      await this.communicationService.sendMessage(clinicId, {
        patient_id: patientId,
        channel: MessageChannel.WHATSAPP,
        category: MessageCategory.TRANSACTIONAL,
        body: `Hi ${patient.first_name}! 😊 Thank you for visiting *${clinic.name}*. We hope you had a great experience!\n\nShare your feedback (takes 30 seconds): ${reviewUrl}\n\nYour review helps other patients find us. 🙏`,
        variables: {
          patient_name: patient.first_name,
          clinic_name: clinic.name,
          review_url: reviewUrl,
        },
        metadata: { automation: 'post_appointment_review', appointment_id: appointmentId },
      });

      this.logger.log(`Review request sent for appointment ${appointmentId}`);
    } catch (e) {
      this.logger.warn(`Post-appointment review trigger failed: ${(e as Error).message}`);
    }
  }
}
