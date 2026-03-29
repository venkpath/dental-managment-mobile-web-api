import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { TemplateService } from '../communication/template.service.js';
import { getBookingUrl } from '../../common/utils/booking-url.util.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { paginate } from '../../common/interfaces/paginated-result.interface.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import type { QueryCampaignDto } from './dto/query-campaign.dto.js';

type CampaignChannel = 'email' | 'sms' | 'whatsapp' | 'all';
type DeliveryChannel = Exclude<CampaignChannel, 'all'>;

interface SegmentPatient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

interface DispatchStats {
  attempted_count: number;
  queued_count: number;
  scheduled_count: number;
  skipped_count: number;
  failed_count: number;
  accepted_by_channel: Record<DeliveryChannel, number>;
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  // Per-channel cost estimates (INR)
  private static readonly COST_PER_MESSAGE: Record<string, number> = {
    sms: 0.25,
    whatsapp: 0.50,
    email: 0.02,
  };

  private static readonly DELIVERY_CHANNELS: DeliveryChannel[] = ['whatsapp', 'sms', 'email'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly templateService: TemplateService,
  ) {}

  private getDeliveryChannels(channel: string): DeliveryChannel[] {
    if (channel === 'all') return [...CampaignService.DELIVERY_CHANNELS];
    if (CampaignService.DELIVERY_CHANNELS.includes(channel as DeliveryChannel)) {
      return [channel as DeliveryChannel];
    }
    throw new BadRequestException(`Unsupported channel "${channel}"`);
  }

  private toMessageChannel(channel: DeliveryChannel): MessageChannel {
    if (channel === 'whatsapp') return MessageChannel.WHATSAPP;
    if (channel === 'sms') return MessageChannel.SMS;
    return MessageChannel.EMAIL;
  }

  private getPerRecipientCost(channels: DeliveryChannel[]): number {
    return channels.reduce((sum, channel) => sum + (CampaignService.COST_PER_MESSAGE[channel] || 0), 0);
  }

  private calculateActualCost(acceptedByChannel: Record<DeliveryChannel, number>): number {
    const raw = CampaignService.DELIVERY_CHANNELS.reduce(
      (sum, channel) => sum + acceptedByChannel[channel] * (CampaignService.COST_PER_MESSAGE[channel] || 0),
      0,
    );
    return Math.round(raw * 100) / 100;
  }

  private buildPatientVariables(patient: SegmentPatient): Record<string, string> {
    return {
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_first_name: patient.first_name,
      patient_last_name: patient.last_name,
      patient_phone: patient.phone,
      patient_email: patient.email || '',
    };
  }

  private async dispatchMessages(
    clinicId: string,
    patients: SegmentPatient[],
    channels: DeliveryChannel[],
    templateId: string,
    metadata: Record<string, unknown>,
  ): Promise<DispatchStats> {
    const stats: DispatchStats = {
      attempted_count: 0,
      queued_count: 0,
      scheduled_count: 0,
      skipped_count: 0,
      failed_count: 0,
      accepted_by_channel: { whatsapp: 0, sms: 0, email: 0 },
    };

    for (const patient of patients) {
      const variables = this.buildPatientVariables(patient);

      for (const channel of channels) {
        stats.attempted_count++;

        try {
          const message = await this.communicationService.sendMessage(clinicId, {
            patient_id: patient.id,
            channel: this.toMessageChannel(channel),
            category: MessageCategory.PROMOTIONAL,
            template_id: templateId,
            variables,
            metadata,
          });

          if (message.status === 'skipped') {
            stats.skipped_count++;
            continue;
          }

          stats.accepted_by_channel[channel]++;

          if (message.status === 'scheduled') {
            stats.scheduled_count++;
          } else {
            stats.queued_count++;
          }
        } catch (error) {
          stats.failed_count++;
          this.logger.warn(
            `Failed to queue campaign message for patient ${patient.id} on ${channel}: ${(error as Error).message}`,
          );
        }
      }
    }

    return stats;
  }

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
        segment_config: JSON.parse(JSON.stringify({
          ...(dto.segment_config || {}),
          ...(dto.button_url_suffix ? { _button_url_suffix: dto.button_url_suffix } : {}),
        })),
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

    try {
      const channels = this.getDeliveryChannels(campaign.channel);
      const patients = await this.resolveSegment(
        clinicId,
        campaign.segment_type,
        (campaign.segment_config as Record<string, unknown>) || {},
      );

      await this.templateService.findOne(clinicId, campaign.template_id);

      const estimatedCost = Math.round((patients.length * this.getPerRecipientCost(channels)) * 100) / 100;

      await this.prisma.campaign.update({
        where: { id },
        data: {
          status: 'running',
          started_at: new Date(),
          estimated_cost: estimatedCost,
        },
      });

      if (patients.length === 0) {
        await this.prisma.campaign.update({
          where: { id },
          data: {
            status: 'completed',
            completed_at: new Date(),
            total_recipients: 0,
            sent_count: 0,
            failed_count: 0,
            actual_cost: 0,
          },
        });

        return {
          total_recipients: 0,
          attempted_count: 0,
          sent_count: 0,
          scheduled_count: 0,
          skipped_count: 0,
          failed_count: 0,
          estimated_cost: estimatedCost,
          actual_cost: 0,
        };
      }

      const segmentConfig = (campaign.segment_config as Record<string, unknown>) || {};
      // Resolve button URL: use explicitly set URL, else derive from clinic's first branch
      let buttonUrlSuffix = segmentConfig['_button_url_suffix'] as string | undefined;
      if (!buttonUrlSuffix) {
        const firstBranch = await this.prisma.branch.findFirst({
          where: { clinic_id: clinicId },
          orderBy: { created_at: 'asc' },
          select: { id: true, book_now_url: true },
        });
        if (firstBranch) {
          buttonUrlSuffix = getBookingUrl(clinicId, firstBranch.id, firstBranch.book_now_url);
        }
      }

      const stats = await this.dispatchMessages(
        clinicId,
        patients,
        channels,
        campaign.template_id,
        {
          campaign_id: campaign.id,
          ...(buttonUrlSuffix ? { button_url_suffix: buttonUrlSuffix } : {}),
        },
      );

      const sentCount = stats.queued_count + stats.scheduled_count;
      const unsentCount = stats.failed_count + stats.skipped_count;
      const actualCost = this.calculateActualCost(stats.accepted_by_channel);

      // Mark completed
      await this.prisma.campaign.update({
        where: { id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          total_recipients: patients.length,
          sent_count: sentCount,
          failed_count: unsentCount,
          actual_cost: actualCost,
        },
      });

      return {
        total_recipients: patients.length,
        attempted_count: stats.attempted_count,
        sent_count: sentCount,
        scheduled_count: stats.scheduled_count,
        skipped_count: stats.skipped_count,
        failed_count: stats.failed_count,
        estimated_cost: estimatedCost,
        actual_cost: actualCost,
      };
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
  ): Promise<SegmentPatient[]> {
    const branchIdFromConfig = typeof config.branch_id === 'string' ? config.branch_id : undefined;
    const baseWhere: Prisma.PatientWhereInput = {
      clinic_id: clinicId,
      ...(branchIdFromConfig ? { branch_id: branchIdFromConfig } : {}),
    };

    switch (segmentType) {
      case 'all':
        return this.prisma.patient.findMany({
          where: baseWhere,
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });

      case 'inactive': {
        const monthsRaw = Number(config.inactive_months ?? 6);
        const months = Number.isFinite(monthsRaw) ? Math.max(1, Math.trunc(monthsRaw)) : 6;
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
        if (!procedure) {
          throw new BadRequestException('segment_config.procedure is required for treatment_type segment');
        }

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
        const monthRaw = Number(config.month ?? (new Date().getMonth() + 1));
        const month = Math.trunc(monthRaw);

        if (!Number.isFinite(monthRaw) || month < 1 || month > 12) {
          throw new BadRequestException('segment_config.month must be between 1 and 12 for birthday_month segment');
        }

        // Use raw SQL for month extraction
        const patients = await this.prisma.$queryRaw<
          { id: string; first_name: string; last_name: string; phone: string; email: string | null }[]
        >`
          SELECT id, first_name, last_name, phone, email
          FROM patients
          WHERE clinic_id = ${clinicId}::uuid
            ${branchIdFromConfig ? Prisma.sql`AND branch_id = ${branchIdFromConfig}::uuid` : Prisma.empty}
            AND EXTRACT(MONTH FROM date_of_birth) = ${month}
        `;
        return patients;
      }

      case 'location': {
        const branchId = config.branch_id as string;
        if (!branchId) {
          throw new BadRequestException('segment_config.branch_id is required for location segment');
        }

        return this.prisma.patient.findMany({
          where: { ...baseWhere, branch_id: branchId },
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });
      }

      case 'custom': {
        const where: Prisma.PatientWhereInput = { ...baseWhere };

        if (config.gender) where.gender = config.gender as string;
        if (config.branch_id) where.branch_id = config.branch_id as string;
        if (config.created_after || config.created_before) {
          where.created_at = {
            ...(config.created_after ? { gte: new Date(config.created_after as string) } : {}),
            ...(config.created_before ? { lte: new Date(config.created_before as string) } : {}),
          };
        }

        if (config.has_email === true) where.email = { not: null };
        if (config.has_email === false) where.email = null;

        return this.prisma.patient.findMany({
          where,
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });
      }

      default:
        throw new BadRequestException(`Unsupported segment type "${segmentType}"`);
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
      roi: this.calculateROI(campaign, attributedBookings),
    };
  }

  // ─── Cost Estimation & ROI (9.9) ───

  /** Estimate campaign cost before execution */
  async estimateCost(clinicId: string, params: {
    segment_type: string;
    segment_config?: Record<string, unknown>;
    channel: string;
  }) {
    const patients = await this.resolveSegment(clinicId, params.segment_type, params.segment_config || {});
    const channels = this.getDeliveryChannels(params.channel);

    const costBreakdown = channels.map(ch => ({
      channel: ch,
      recipients: patients.length,
      cost_per_message: CampaignService.COST_PER_MESSAGE[ch] || 0,
      total_cost: patients.length * (CampaignService.COST_PER_MESSAGE[ch] || 0),
    }));

    const totalEstimatedCost = costBreakdown.reduce((sum, c) => sum + c.total_cost, 0);
    const totalMessages = patients.length * channels.length;

    return {
      total_recipients: patients.length,
      total_messages: totalMessages,
      channels: costBreakdown,
      total_estimated_cost: Math.round(totalEstimatedCost * 100) / 100,
      currency: 'INR',
    };
  }

  /** Calculate ROI for a completed campaign */
  private calculateROI(
    campaign: { actual_cost: unknown; estimated_cost: unknown },
    attributedBookings: number,
  ): { roi_percentage: number; revenue_attributed: number; cost: number } {
    const avgBookingValue = 2000; // Average dental appointment value in INR
    const revenueAttributed = attributedBookings * avgBookingValue;
    const cost = Number(campaign.actual_cost || campaign.estimated_cost || 0);
    const roiPercentage = cost > 0 ? Math.round(((revenueAttributed - cost) / cost) * 100) : 0;

    return {
      roi_percentage: roiPercentage,
      revenue_attributed: revenueAttributed,
      cost,
    };
  }

  // ─── A/B Testing (9.8) ───

  /** Execute a campaign with A/B testing — split audience between template variants */
  async executeABTest(clinicId: string, id: string, variantTemplateId: string, splitPercentage = 50) {
    const campaign = await this.findOne(clinicId, id);

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot execute A/B test on ${campaign.status} campaign`);
    }

    if (!campaign.template_id) {
      throw new BadRequestException('Campaign must have a primary template (variant A)');
    }

    if (splitPercentage <= 0 || splitPercentage >= 100) {
      throw new BadRequestException('split_percentage must be between 1 and 99');
    }

    // Validate variant B template
    await this.templateService.findOne(clinicId, variantTemplateId);

    try {
      const channels = this.getDeliveryChannels(campaign.channel);
      const patients = await this.resolveSegment(
        clinicId,
        campaign.segment_type,
        (campaign.segment_config as Record<string, unknown>) || {},
      );

      const estimatedCost = Math.round((patients.length * this.getPerRecipientCost(channels)) * 100) / 100;

      await this.prisma.campaign.update({
        where: { id },
        data: {
          status: 'running',
          started_at: new Date(),
          estimated_cost: estimatedCost,
        },
      });

      if (patients.length === 0) {
        await this.prisma.campaign.update({
          where: { id },
          data: {
            status: 'completed',
            completed_at: new Date(),
            total_recipients: 0,
            sent_count: 0,
            failed_count: 0,
            actual_cost: 0,
          },
        });

        return {
          total_recipients: 0,
          variant_a: { template_id: campaign.template_id, recipients: 0, sent: 0, skipped: 0, failed: 0 },
          variant_b: { template_id: variantTemplateId, recipients: 0, sent: 0, skipped: 0, failed: 0 },
          estimated_cost: estimatedCost,
          actual_cost: 0,
        };
      }

      // Randomly split patients into A and B groups
      const shuffled = [...patients].sort(() => Math.random() - 0.5);
      const splitIndex = Math.floor(shuffled.length * (splitPercentage / 100));
      const groupA = shuffled.slice(0, splitIndex);
      const groupB = shuffled.slice(splitIndex);

      const statsA = await this.dispatchMessages(
        clinicId,
        groupA,
        channels,
        campaign.template_id,
        { campaign_id: campaign.id, ab_variant: 'A' },
      );

      const statsB = await this.dispatchMessages(
        clinicId,
        groupB,
        channels,
        variantTemplateId,
        { campaign_id: campaign.id, ab_variant: 'B' },
      );

      const totalSent = statsA.queued_count + statsA.scheduled_count + statsB.queued_count + statsB.scheduled_count;
      const totalUnsent =
        statsA.failed_count + statsA.skipped_count +
        statsB.failed_count + statsB.skipped_count;
      const actualCost = this.calculateActualCost({
        whatsapp: statsA.accepted_by_channel.whatsapp + statsB.accepted_by_channel.whatsapp,
        sms: statsA.accepted_by_channel.sms + statsB.accepted_by_channel.sms,
        email: statsA.accepted_by_channel.email + statsB.accepted_by_channel.email,
      });

      await this.prisma.campaign.update({
        where: { id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          total_recipients: patients.length,
          sent_count: totalSent,
          failed_count: totalUnsent,
          actual_cost: actualCost,
        },
      });

      return {
        total_recipients: patients.length,
        variant_a: {
          template_id: campaign.template_id,
          recipients: groupA.length,
          sent: statsA.queued_count + statsA.scheduled_count,
          skipped: statsA.skipped_count,
          failed: statsA.failed_count,
        },
        variant_b: {
          template_id: variantTemplateId,
          recipients: groupB.length,
          sent: statsB.queued_count + statsB.scheduled_count,
          skipped: statsB.skipped_count,
          failed: statsB.failed_count,
        },
        estimated_cost: estimatedCost,
        actual_cost: actualCost,
      };
    } catch (error) {
      await this.prisma.campaign.update({
        where: { id },
        data: { status: 'draft', started_at: null },
      });
      throw error;
    }
  }

  /** Get A/B test results — compare delivery and response rates between variants */
  async getABTestResults(clinicId: string, campaignId: string) {
    const campaign = await this.findOne(clinicId, campaignId);

    const [variantA, variantB] = await Promise.all([
      this.prisma.communicationMessage.groupBy({
        by: ['status'],
        where: {
          clinic_id: clinicId,
          metadata: { path: ['campaign_id'], equals: campaignId },
          AND: { metadata: { path: ['ab_variant'], equals: 'A' } },
        },
        _count: true,
      }),
      this.prisma.communicationMessage.groupBy({
        by: ['status'],
        where: {
          clinic_id: clinicId,
          metadata: { path: ['campaign_id'], equals: campaignId },
          AND: { metadata: { path: ['ab_variant'], equals: 'B' } },
        },
        _count: true,
      }),
    ]);

    const summarize = (data: { status: string; _count: number }[]) => {
      const map = Object.fromEntries(data.map(d => [d.status, d._count]));
      const total = Object.values(map).reduce((s, v) => s + v, 0);
      const delivered = (map['delivered'] || 0) + (map['read'] || 0);
      return {
        total,
        delivered,
        failed: map['failed'] || 0,
        delivery_rate: total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0,
      };
    };

    return {
      campaign_id: campaignId,
      status: campaign.status,
      variant_a: summarize(variantA),
      variant_b: summarize(variantB),
      winner: this.determineABWinner(summarize(variantA), summarize(variantB)),
    };
  }

  private determineABWinner(a: { delivery_rate: number; total: number }, b: { delivery_rate: number; total: number }): string {
    if (a.total === 0 && b.total === 0) return 'no_data';
    if (a.delivery_rate > b.delivery_rate + 5) return 'A';
    if (b.delivery_rate > a.delivery_rate + 5) return 'B';
    return 'tie';
  }

  // ─── Reactivation Drip Sequence (9.7) ───

  /**
   * Create and execute a multi-step drip campaign.
   * Steps are sent at configured intervals (e.g., Day 0, Day 7, Day 21).
   * Each step can use a different template.
   */
  async createDripSequence(clinicId: string, userId: string, params: {
    name: string;
    channel: string;
    segment_type: string;
    segment_config?: Record<string, unknown>;
    steps: Array<{
      template_id: string;
      delay_days: number;
    }>;
  }) {
    if (!params.steps || params.steps.length === 0) {
      throw new BadRequestException('At least one drip step is required');
    }

    // Validate all templates
    for (const step of params.steps) {
      await this.templateService.findOne(clinicId, step.template_id);
    }

    // Create the parent campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        clinic_id: clinicId,
        name: params.name,
        channel: params.channel,
        template_id: params.steps[0].template_id,
        segment_type: params.segment_type,
        segment_config: params.segment_config ? JSON.parse(JSON.stringify(params.segment_config)) : undefined,
        status: 'scheduled',
        created_by: userId,
      },
    });

    // Store drip steps in campaign metadata (we'll use campaign update for this)
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        segment_config: JSON.parse(JSON.stringify({
          ...(params.segment_config || {}),
          _drip_steps: params.steps,
          _is_drip: true,
        })),
      },
    });

    return {
      campaign_id: campaign.id,
      name: params.name,
      steps: params.steps.map((s, i) => ({
        step: i + 1,
        template_id: s.template_id,
        delay_days: s.delay_days,
        scheduled_for: new Date(Date.now() + s.delay_days * 24 * 60 * 60 * 1000).toISOString(),
      })),
    };
  }

  /** Execute a specific drip step (called by the campaign cron scheduler) */
  async executeDripStep(clinicId: string, campaignId: string, stepIndex: number) {
    const campaign = await this.findOne(clinicId, campaignId);
    const config = (campaign.segment_config as Record<string, unknown>) || {};
    const steps = (config._drip_steps as Array<{ template_id: string; delay_days: number }>) || [];

    if (stepIndex >= steps.length) {
      this.logger.log(`Drip campaign ${campaignId}: all steps completed`);
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'completed', completed_at: new Date() },
      });
      return { completed: true };
    }

    const step = steps[stepIndex];
    const patients = await this.resolveSegment(
      clinicId,
      campaign.segment_type,
      config,
    );

    const channels = this.getDeliveryChannels(campaign.channel);
    const stats = await this.dispatchMessages(
      clinicId,
      patients,
      channels,
      step.template_id,
      {
        campaign_id: campaignId,
        drip_step: stepIndex,
      },
    );

    const sent = stats.queued_count + stats.scheduled_count;

    // Update campaign progress
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: stepIndex >= steps.length - 1 ? 'completed' : 'running',
        sent_count: { increment: sent },
        failed_count: { increment: stats.failed_count + stats.skipped_count },
        total_recipients: patients.length,
        ...(stepIndex >= steps.length - 1 ? { completed_at: new Date() } : {}),
      },
    });

    this.logger.log(`Drip step ${stepIndex + 1}/${steps.length} for campaign ${campaignId}: sent ${sent} messages`);
    return {
      step: stepIndex + 1,
      total_steps: steps.length,
      sent,
      skipped: stats.skipped_count,
      failed: stats.failed_count,
    };
  }

  // ─── Festival Offer → Campaign (10.4) ───

  /** Create a one-click campaign from a festival event with offer details */
  async createFromFestivalEvent(clinicId: string, userId: string, eventId: string) {
    const event = await this.prisma.clinicEvent.findFirst({
      where: {
        id: eventId,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      include: { template: true },
    });

    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found`);
    }

    const offerDetails = event.offer_details as Record<string, unknown> | null;

    // Find festival greeting template
    const templateId = event.template_id || (await this.prisma.messageTemplate.findFirst({
      where: {
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
        template_name: 'Festival Greeting',
        is_active: true,
      },
      orderBy: { clinic_id: 'desc' }, // prefer clinic-specific
    }))?.id;

    if (!templateId) {
      throw new BadRequestException('No festival greeting template found. Create one first.');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        clinic_id: clinicId,
        name: `${event.event_name} Campaign${offerDetails ? ' with Offer' : ''}`,
        channel: 'all',
        template_id: templateId,
        segment_type: 'all',
        segment_config: JSON.parse(JSON.stringify({
          festival_name: event.event_name,
          offer_details: offerDetails
            ? `${offerDetails.percentage || ''}% off on ${offerDetails.treatment || 'all treatments'}. Valid until ${offerDetails.valid_until || 'end of month'}.`
            : undefined,
        })),
        status: 'draft',
        created_by: userId,
      },
      include: { template: { select: { template_name: true } } },
    });

    return {
      campaign,
      event_name: event.event_name,
      offer_details: offerDetails,
      message: `Campaign created from "${event.event_name}" event. Review and execute when ready.`,
    };
  }
}
