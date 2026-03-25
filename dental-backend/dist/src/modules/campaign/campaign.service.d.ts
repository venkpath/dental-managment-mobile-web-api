import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { TemplateService } from '../communication/template.service.js';
import type { CreateCampaignDto } from './dto/create-campaign.dto.js';
import type { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import type { QueryCampaignDto } from './dto/query-campaign.dto.js';
type CampaignChannel = 'email' | 'sms' | 'whatsapp' | 'all';
type DeliveryChannel = Exclude<CampaignChannel, 'all'>;
export declare class CampaignService {
    private readonly prisma;
    private readonly communicationService;
    private readonly templateService;
    private readonly logger;
    private static readonly COST_PER_MESSAGE;
    private static readonly DELIVERY_CHANNELS;
    constructor(prisma: PrismaService, communicationService: CommunicationService, templateService: TemplateService);
    private getDeliveryChannels;
    private toMessageChannel;
    private getPerRecipientCost;
    private calculateActualCost;
    private buildPatientVariables;
    private dispatchMessages;
    create(clinicId: string, userId: string, dto: CreateCampaignDto): Promise<{
        template: {
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        channel: string;
        template_id: string | null;
        scheduled_at: Date | null;
        segment_type: string;
        segment_config: Prisma.JsonValue | null;
        started_at: Date | null;
        completed_at: Date | null;
        total_recipients: number;
        sent_count: number;
        delivered_count: number;
        failed_count: number;
        read_count: number;
        estimated_cost: Prisma.Decimal | null;
        actual_cost: Prisma.Decimal | null;
        created_by: string;
    }>;
    findAll(clinicId: string, query: QueryCampaignDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        template: {
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        channel: string;
        template_id: string | null;
        scheduled_at: Date | null;
        segment_type: string;
        segment_config: Prisma.JsonValue | null;
        started_at: Date | null;
        completed_at: Date | null;
        total_recipients: number;
        sent_count: number;
        delivered_count: number;
        failed_count: number;
        read_count: number;
        estimated_cost: Prisma.Decimal | null;
        actual_cost: Prisma.Decimal | null;
        created_by: string;
    }>>;
    findOne(clinicId: string, id: string): Promise<{
        template: {
            id: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string | null;
            channel: string;
            category: string;
            template_name: string;
            subject: string | null;
            body: string;
            variables: Prisma.JsonValue | null;
            language: string;
            is_active: boolean;
            dlt_template_id: string | null;
            whatsapp_template_status: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        channel: string;
        template_id: string | null;
        scheduled_at: Date | null;
        segment_type: string;
        segment_config: Prisma.JsonValue | null;
        started_at: Date | null;
        completed_at: Date | null;
        total_recipients: number;
        sent_count: number;
        delivered_count: number;
        failed_count: number;
        read_count: number;
        estimated_cost: Prisma.Decimal | null;
        actual_cost: Prisma.Decimal | null;
        created_by: string;
    }>;
    update(clinicId: string, id: string, dto: UpdateCampaignDto): Promise<{
        template: {
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        channel: string;
        template_id: string | null;
        scheduled_at: Date | null;
        segment_type: string;
        segment_config: Prisma.JsonValue | null;
        started_at: Date | null;
        completed_at: Date | null;
        total_recipients: number;
        sent_count: number;
        delivered_count: number;
        failed_count: number;
        read_count: number;
        estimated_cost: Prisma.Decimal | null;
        actual_cost: Prisma.Decimal | null;
        created_by: string;
    }>;
    delete(clinicId: string, id: string): Promise<{
        id: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        channel: string;
        template_id: string | null;
        scheduled_at: Date | null;
        segment_type: string;
        segment_config: Prisma.JsonValue | null;
        started_at: Date | null;
        completed_at: Date | null;
        total_recipients: number;
        sent_count: number;
        delivered_count: number;
        failed_count: number;
        read_count: number;
        estimated_cost: Prisma.Decimal | null;
        actual_cost: Prisma.Decimal | null;
        created_by: string;
    }>;
    getAudiencePreview(clinicId: string, segmentType: string, segmentConfig?: Record<string, unknown>): Promise<{
        total_count: number;
        sample: {
            id: string;
            name: string;
            phone: string;
            email: string | null;
        }[];
    }>;
    execute(clinicId: string, id: string): Promise<{
        total_recipients: number;
        attempted_count: number;
        sent_count: number;
        scheduled_count: number;
        skipped_count: number;
        failed_count: number;
        estimated_cost: number;
        actual_cost: number;
    }>;
    private resolveSegment;
    getAnalytics(clinicId: string, campaignId: string): Promise<{
        campaign_id: string;
        status: string;
        total_recipients: number;
        message_breakdown: {
            status: string;
            count: number;
        }[];
        attributed_bookings: number;
        estimated_cost: Prisma.Decimal | null;
        actual_cost: Prisma.Decimal | null;
        roi: {
            roi_percentage: number;
            revenue_attributed: number;
            cost: number;
        };
    }>;
    estimateCost(clinicId: string, params: {
        segment_type: string;
        segment_config?: Record<string, unknown>;
        channel: string;
    }): Promise<{
        total_recipients: number;
        total_messages: number;
        channels: {
            channel: DeliveryChannel;
            recipients: number;
            cost_per_message: number;
            total_cost: number;
        }[];
        total_estimated_cost: number;
        currency: string;
    }>;
    private calculateROI;
    executeABTest(clinicId: string, id: string, variantTemplateId: string, splitPercentage?: number): Promise<{
        total_recipients: number;
        variant_a: {
            template_id: string;
            recipients: number;
            sent: number;
            skipped: number;
            failed: number;
        };
        variant_b: {
            template_id: string;
            recipients: number;
            sent: number;
            skipped: number;
            failed: number;
        };
        estimated_cost: number;
        actual_cost: number;
    }>;
    getABTestResults(clinicId: string, campaignId: string): Promise<{
        campaign_id: string;
        status: string;
        variant_a: {
            total: number;
            delivered: number;
            failed: number;
            delivery_rate: number;
        };
        variant_b: {
            total: number;
            delivered: number;
            failed: number;
            delivery_rate: number;
        };
        winner: string;
    }>;
    private determineABWinner;
    createDripSequence(clinicId: string, userId: string, params: {
        name: string;
        channel: string;
        segment_type: string;
        segment_config?: Record<string, unknown>;
        steps: Array<{
            template_id: string;
            delay_days: number;
        }>;
    }): Promise<{
        campaign_id: string;
        name: string;
        steps: {
            step: number;
            template_id: string;
            delay_days: number;
            scheduled_for: string;
        }[];
    }>;
    executeDripStep(clinicId: string, campaignId: string, stepIndex: number): Promise<{
        completed: boolean;
        step?: undefined;
        total_steps?: undefined;
        sent?: undefined;
        skipped?: undefined;
        failed?: undefined;
    } | {
        step: number;
        total_steps: number;
        sent: number;
        skipped: number;
        failed: number;
        completed?: undefined;
    }>;
    createFromFestivalEvent(clinicId: string, userId: string, eventId: string): Promise<{
        campaign: {
            template: {
                template_name: string;
            } | null;
        } & {
            id: string;
            name: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            channel: string;
            template_id: string | null;
            scheduled_at: Date | null;
            segment_type: string;
            segment_config: Prisma.JsonValue | null;
            started_at: Date | null;
            completed_at: Date | null;
            total_recipients: number;
            sent_count: number;
            delivered_count: number;
            failed_count: number;
            read_count: number;
            estimated_cost: Prisma.Decimal | null;
            actual_cost: Prisma.Decimal | null;
            created_by: string;
        };
        event_name: string;
        offer_details: Record<string, unknown> | null;
        message: string;
    }>;
}
export {};
