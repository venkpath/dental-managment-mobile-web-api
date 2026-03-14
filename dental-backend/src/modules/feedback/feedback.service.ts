import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import type { CreateFeedbackDto, QueryFeedbackDto } from './dto/index.js';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
  ) {}

  async create(clinicId: string, dto: CreateFeedbackDto) {
    const feedback = await this.prisma.patientFeedback.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });

    // If rating >= 4, ask for Google review (if automation enabled)
    if (dto.rating >= 4) {
      await this.requestGoogleReview(clinicId, feedback);
    }

    return feedback;
  }

  async findAll(clinicId: string, query: QueryFeedbackDto) {
    const { page = 1, limit = 20, patient_id, min_rating } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { clinic_id: clinicId };
    if (patient_id) where.patient_id = patient_id;
    if (min_rating) where.rating = { gte: min_rating };

    const [data, total] = await Promise.all([
      this.prisma.patientFeedback.findMany({
        where,
        include: {
          patient: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patientFeedback.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(clinicId: string) {
    const [total, avgResult, distribution] = await Promise.all([
      this.prisma.patientFeedback.count({ where: { clinic_id: clinicId } }),
      this.prisma.patientFeedback.aggregate({
        where: { clinic_id: clinicId },
        _avg: { rating: true },
      }),
      this.prisma.patientFeedback.groupBy({
        by: ['rating'],
        where: { clinic_id: clinicId },
        _count: { id: true },
      }),
    ]);

    const googleReviewRequests = await this.prisma.patientFeedback.count({
      where: { clinic_id: clinicId, google_review_requested: true },
    });

    return {
      total_feedback: total,
      average_rating: avgResult._avg.rating ? Number(avgResult._avg.rating.toFixed(1)) : 0,
      google_review_requests: googleReviewRequests,
      distribution: distribution.reduce(
        (acc, d) => {
          acc[d.rating] = d._count.id;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };
  }

  private async requestGoogleReview(
    clinicId: string,
    feedback: { id: string; patient_id: string; patient: { first_name: string; last_name: string; email: string | null } },
  ) {
    try {
      const rule = await this.automationService.getRuleConfig(clinicId, 'feedback_collection');
      if (!rule?.is_enabled) return;

      const config = (rule.config as Record<string, unknown>) || {};
      const minRating = (config.min_rating_for_google_review as number) || 4;
      if (feedback.patient_id && minRating) {
        // Already checked rating >= 4, but verify against config
      }

      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true },
      });

      // Look for google_review_url in clinic communication settings
      const commSettings = await this.prisma.clinicCommunicationSettings.findUnique({
        where: { clinic_id: clinicId },
        select: { whatsapp_config: true },
      });

      const whatsappConfig = (commSettings?.whatsapp_config as Record<string, unknown>) || {};
      const googleReviewUrl = whatsappConfig.google_review_url as string;

      if (!googleReviewUrl) return;

      await this.prisma.patientFeedback.update({
        where: { id: feedback.id },
        data: { google_review_requested: true },
      });

      await this.communicationService.sendMessage(clinicId, {
        patient_id: feedback.patient_id,
        channel: MessageChannel.WHATSAPP,
        category: MessageCategory.PROMOTIONAL,
        body: `Thank you for the wonderful feedback, ${feedback.patient.first_name}! 😊 We'd love it if you could share your experience on Google: ${googleReviewUrl}`,
        variables: {
          patient_name: `${feedback.patient.first_name} ${feedback.patient.last_name}`,
          clinic_name: clinic?.name || '',
          review_url: googleReviewUrl,
        },
        metadata: { automation: 'google_review_request', feedback_id: feedback.id },
      });
    } catch (e) {
      this.logger.warn(`Google review request failed: ${(e as Error).message}`);
    }
  }
}
