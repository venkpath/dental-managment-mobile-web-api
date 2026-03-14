import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { TemplateService } from '../communication/template.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { paginate } from '../../common/interfaces/paginated-result.interface.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import type { QueryCampaignDto } from './dto/query-campaign.dto.js';

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly templateService: TemplateService,
  ) {}

  // ─── CRUD ───

  async create(clinicId: string, userId: string, dto: CreateCampaignDto) {
    // Validate template exists if provided
    if (dto.template_id) {
      await this.templateService.findOne(clinicId, dto.template_id);
    }

    return this.prisma.campaign.create({
      data: {
        clinic_id: clinicId,
        name: dto.name,
        channel: dto.channel,
        template_id: dto.template_id,
        segment_type: dto.segment_type,
        segment_config: dto.segment_config ? JSON.parse(JSON.stringify(dto.segment_config)) : undefined,
        status: dto.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
        created_by: userId,
      },
      include: { template: { select: { template_name: true, channel: true } } },
    });
  }

  async findAll(clinicId: string, query: QueryCampaignDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CampaignWhereInput = { clinic_id: clinicId };
    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { template: { select: { template_name: true, channel: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, clinic_id: clinicId },
      include: { template: true },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign "${id}" not found`);
    }

    return campaign;
  }

  async update(clinicId: string, id: string, dto: UpdateCampaignDto) {
    const existing = await this.findOne(clinicId, id);

    if (['running', 'completed'].includes(existing.status)) {
      throw new BadRequestException(`Cannot update a ${existing.status} campaign`);
    }

    if (dto.template_id) {
      await this.templateService.findOne(clinicId, dto.template_id);
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        segment_config: dto.segment_config ? JSON.parse(JSON.stringify(dto.segment_config)) : undefined,
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      },
      include: { template: { select: { template_name: true, channel: true } } },
    });
  }

  async delete(clinicId: string, id: string) {
    const existing = await this.findOne(clinicId, id);

    if (existing.status === 'running') {
      throw new BadRequestException('Cannot delete a running campaign');
    }

    return this.prisma.campaign.delete({ where: { id } });
  }

  // ─── Audience Preview ───

  async getAudiencePreview(clinicId: string, segmentType: string, segmentConfig?: Record<string, unknown>) {
    const patients = await this.resolveSegment(clinicId, segmentType, segmentConfig || {});
    return {
      total_count: patients.length,
      sample: patients.slice(0, 10).map((p) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        phone: p.phone,
        email: p.email,
      })),
    };
  }

  // ─── Campaign Execution ───

  async execute(clinicId: string, id: string) {
    const campaign = await this.findOne(clinicId, id);

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot execute campaign in ${campaign.status} status`);
    }

    if (!campaign.template_id) {
      throw new BadRequestException('Campaign must have a template to execute');
    }

    // Mark as running
    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'running', started_at: new Date() },
    });

    try {
      const patients = await this.resolveSegment(
        clinicId,
        campaign.segment_type,
        (campaign.segment_config as Record<string, unknown>) || {},
      );

      await this.templateService.findOne(clinicId, campaign.template_id);

      // Track counters
      let sentCount = 0;
      let failedCount = 0;

      // Determine channels to send on
      const channelMap: Record<string, MessageChannel> = {
        whatsapp: MessageChannel.WHATSAPP,
        sms: MessageChannel.SMS,
        email: MessageChannel.EMAIL,
      };
      const channelKeys = campaign.channel === 'all'
        ? ['whatsapp', 'sms', 'email']
        : [campaign.channel];

      // Queue messages for each patient
      for (const patient of patients) {
        for (const ch of channelKeys) {
          try {
            await this.communicationService.sendMessage(clinicId, {
              patient_id: patient.id,
              channel: channelMap[ch] || MessageChannel.WHATSAPP,
              category: MessageCategory.PROMOTIONAL,
              template_id: campaign.template_id,
              variables: {
                patient_name: `${patient.first_name} ${patient.last_name}`,
                patient_first_name: patient.first_name,
                patient_phone: patient.phone,
                patient_email: patient.email || '',
              },
              metadata: { campaign_id: campaign.id },
            });
            sentCount++;
          } catch {
            failedCount++;
          }
        }
      }

      // Mark completed
      await this.prisma.campaign.update({
        where: { id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          total_recipients: patients.length,
          sent_count: sentCount,
          failed_count: failedCount,
        },
      });

      return { total_recipients: patients.length, sent_count: sentCount, failed_count: failedCount };
    } catch (error) {
      // Revert to draft on critical failure
      await this.prisma.campaign.update({
        where: { id },
        data: { status: 'draft', started_at: null },
      });
      throw error;
    }
  }

  // ─── Segment Resolution ───

  private async resolveSegment(
    clinicId: string,
    segmentType: string,
    config: Record<string, unknown>,
  ) {
    const baseWhere: Prisma.PatientWhereInput = { clinic_id: clinicId };

    switch (segmentType) {
      case 'all':
        return this.prisma.patient.findMany({
          where: baseWhere,
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });

      case 'inactive': {
        const months = (config.inactive_months as number) || 6;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);

        return this.prisma.patient.findMany({
          where: {
            ...baseWhere,
            appointments: {
              none: { appointment_date: { gte: cutoffDate } },
            },
          },
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });
      }

      case 'treatment_type': {
        const procedure = config.procedure as string;
        if (!procedure) return [];

        return this.prisma.patient.findMany({
          where: {
            ...baseWhere,
            treatments: {
              some: { procedure: { contains: procedure, mode: 'insensitive' } },
            },
          },
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });
      }

      case 'birthday_month': {
        const month = (config.month as number) || new Date().getMonth() + 1;
        // Use raw SQL for month extraction
        const patients = await this.prisma.$queryRaw<
          { id: string; first_name: string; last_name: string; phone: string; email: string | null }[]
        >`
          SELECT id, first_name, last_name, phone, email
          FROM patients
          WHERE clinic_id = ${clinicId}::uuid
            AND EXTRACT(MONTH FROM date_of_birth) = ${month}
        `;
        return patients;
      }

      case 'location': {
        const branchId = config.branch_id as string;
        if (!branchId) return [];

        return this.prisma.patient.findMany({
          where: { ...baseWhere, branch_id: branchId },
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });
      }

      case 'custom': {
        const where: Prisma.PatientWhereInput = { ...baseWhere };

        if (config.gender) where.gender = config.gender as string;
        if (config.branch_id) where.branch_id = config.branch_id as string;
        if (config.created_after) where.created_at = { gte: new Date(config.created_after as string) };

        return this.prisma.patient.findMany({
          where,
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });
      }

      default:
        return [];
    }
  }

  // ─── Campaign Analytics ───

  async getAnalytics(clinicId: string, campaignId: string) {
    const campaign = await this.findOne(clinicId, campaignId);

    // Count messages linked to this campaign
    const messages = await this.prisma.communicationMessage.groupBy({
      by: ['status'],
      where: {
        clinic_id: clinicId,
        metadata: { path: ['campaign_id'], equals: campaignId },
      },
      _count: true,
    });

    // Count appointments booked within 7 days of campaign start (attribution)
    let attributedBookings = 0;
    if (campaign.started_at) {
      const attributionEnd = new Date(campaign.started_at);
      attributionEnd.setDate(attributionEnd.getDate() + 7);

      attributedBookings = await this.prisma.appointment.count({
        where: {
          clinic_id: clinicId,
          created_at: { gte: campaign.started_at, lte: attributionEnd },
        },
      });
    }

    return {
      campaign_id: campaignId,
      status: campaign.status,
      total_recipients: campaign.total_recipients,
      message_breakdown: messages.map((m) => ({ status: m.status, count: m._count })),
      attributed_bookings: attributedBookings,
      estimated_cost: campaign.estimated_cost,
      actual_cost: campaign.actual_cost,
    };
  }
}
