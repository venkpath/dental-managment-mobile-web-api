import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { TemplateService } from './template.service.js';
import { TemplateRenderer } from './template-renderer.js';
import { CommunicationProducer } from './communication.producer.js';
import { EmailProvider } from './providers/email.provider.js';
import { SmsProvider } from './providers/sms.provider.js';
import { WhatsAppProvider } from './providers/whatsapp.provider.js';
import type { SendMessageDto } from './dto/send-message.dto.js';
import type { QueryMessageDto } from './dto/query-message.dto.js';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import type { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto.js';
export declare class CommunicationService {
    private readonly prisma;
    private readonly configService;
    private readonly templateService;
    private readonly renderer;
    private readonly producer;
    private readonly emailProvider;
    private readonly smsProvider;
    private readonly whatsAppProvider;
    private readonly logger;
    private readonly configurationLocks;
    constructor(prisma: PrismaService, configService: ConfigService, templateService: TemplateService, renderer: TemplateRenderer, producer: CommunicationProducer, emailProvider: EmailProvider, smsProvider: SmsProvider, whatsAppProvider: WhatsAppProvider);
    sendMessage(clinicId: string, dto: SendMessageDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        channel: string;
        category: string;
        subject: string | null;
        body: string;
        metadata: Prisma.JsonValue | null;
        patient_id: string | null;
        template_id: string | null;
        scheduled_at: Date | null;
        recipient: string;
        direction: string;
        skip_reason: string | null;
        wa_message_id: string | null;
        sent_at: Date | null;
    }>;
    findAllMessages(clinicId: string, query: QueryMessageDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        patient: {
            email: string | null;
            phone: string;
            first_name: string;
            last_name: string;
        } | null;
        template: {
            channel: string;
            template_name: string;
        } | null;
        logs: {
            id: string;
            status: string;
            created_at: Date;
            channel: string;
            cost: Prisma.Decimal | null;
            sent_at: Date | null;
            message_id: string;
            provider: string;
            provider_message_id: string | null;
            error_message: string | null;
            delivered_at: Date | null;
            read_at: Date | null;
            failed_at: Date | null;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        channel: string;
        category: string;
        subject: string | null;
        body: string;
        metadata: Prisma.JsonValue | null;
        patient_id: string | null;
        template_id: string | null;
        scheduled_at: Date | null;
        recipient: string;
        direction: string;
        skip_reason: string | null;
        wa_message_id: string | null;
        sent_at: Date | null;
    }>>;
    findOneMessage(clinicId: string, id: string): Promise<{
        patient: {
            email: string | null;
            phone: string;
            first_name: string;
            last_name: string;
        } | null;
        template: {
            id: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string | null;
            channel: string;
            category: string;
            template_name: string;
            subject: string | null;
            footer: string | null;
            body: string;
            variables: Prisma.JsonValue | null;
            language: string;
            is_active: boolean;
            dlt_template_id: string | null;
            whatsapp_template_status: string | null;
            meta_template_id: string | null;
        } | null;
        logs: {
            id: string;
            status: string;
            created_at: Date;
            channel: string;
            cost: Prisma.Decimal | null;
            sent_at: Date | null;
            message_id: string;
            provider: string;
            provider_message_id: string | null;
            error_message: string | null;
            delivered_at: Date | null;
            read_at: Date | null;
            failed_at: Date | null;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        channel: string;
        category: string;
        subject: string | null;
        body: string;
        metadata: Prisma.JsonValue | null;
        patient_id: string | null;
        template_id: string | null;
        scheduled_at: Date | null;
        recipient: string;
        direction: string;
        skip_reason: string | null;
        wa_message_id: string | null;
        sent_at: Date | null;
    }>;
    getPatientTimeline(clinicId: string, patientId: string, page?: number, limit?: number, channel?: string): Promise<{
        data: ({
            template: {
                channel: string;
                template_name: string;
            } | null;
            logs: {
                id: string;
                status: string;
                created_at: Date;
                channel: string;
                cost: Prisma.Decimal | null;
                sent_at: Date | null;
                message_id: string;
                provider: string;
                provider_message_id: string | null;
                error_message: string | null;
                delivered_at: Date | null;
                read_at: Date | null;
                failed_at: Date | null;
            }[];
        } & {
            id: string;
            status: string;
            created_at: Date;
            clinic_id: string;
            channel: string;
            category: string;
            subject: string | null;
            body: string;
            metadata: Prisma.JsonValue | null;
            patient_id: string | null;
            template_id: string | null;
            scheduled_at: Date | null;
            recipient: string;
            direction: string;
            skip_reason: string | null;
            wa_message_id: string | null;
            sent_at: Date | null;
        })[];
        meta: import("../../common/interfaces/paginated-result.interface.js").PaginationMeta;
        patient: {
            id: string;
            first_name: string;
            last_name: string;
        };
    }>;
    createLog(data: {
        message_id: string;
        channel: string;
        provider: string;
        provider_message_id?: string;
        status: string;
        error_message?: string;
        cost?: number;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        channel: string;
        cost: Prisma.Decimal | null;
        sent_at: Date | null;
        message_id: string;
        provider: string;
        provider_message_id: string | null;
        error_message: string | null;
        delivered_at: Date | null;
        read_at: Date | null;
        failed_at: Date | null;
    }>;
    updateMessageStatus(messageId: string, status: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        channel: string;
        category: string;
        subject: string | null;
        body: string;
        metadata: Prisma.JsonValue | null;
        patient_id: string | null;
        template_id: string | null;
        scheduled_at: Date | null;
        recipient: string;
        direction: string;
        skip_reason: string | null;
        wa_message_id: string | null;
        sent_at: Date | null;
    }>;
    getPatientPreferences(clinicId: string, patientId: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        patient_id: string;
        allow_email: boolean;
        allow_sms: boolean;
        allow_whatsapp: boolean;
        allow_marketing: boolean;
        allow_reminders: boolean;
        preferred_channel: string;
        quiet_hours_start: string | null;
        quiet_hours_end: string | null;
    }>;
    updatePatientPreferences(clinicId: string, patientId: string, dto: UpdatePreferencesDto, changedBy?: string, ipAddress?: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        patient_id: string;
        allow_email: boolean;
        allow_sms: boolean;
        allow_whatsapp: boolean;
        allow_marketing: boolean;
        allow_reminders: boolean;
        preferred_channel: string;
        quiet_hours_start: string | null;
        quiet_hours_end: string | null;
    }>;
    generateOptOutToken(patientId: string): string;
    generateOptOutUrl(patientId: string): string;
    verifyOptOutToken(token: string): {
        patientId: string;
    } | null;
    processOptOut(token: string, channels?: string[], ipAddress?: string): Promise<{
        message: string;
        patient_name: string;
        preferences: {
            id: string;
            created_at: Date;
            updated_at: Date;
            patient_id: string;
            allow_email: boolean;
            allow_sms: boolean;
            allow_whatsapp: boolean;
            allow_marketing: boolean;
            allow_reminders: boolean;
            preferred_channel: string;
            quiet_hours_start: string | null;
            quiet_hours_end: string | null;
        };
    }>;
    getClinicSettings(clinicId: string): Promise<{
        can_customize_providers: boolean;
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        google_review_url: string | null;
        enable_email: boolean;
        enable_sms: boolean;
        enable_whatsapp: boolean;
        email_provider: string | null;
        email_config: Prisma.JsonValue | null;
        sms_provider: string | null;
        sms_config: Prisma.JsonValue | null;
        whatsapp_provider: string | null;
        whatsapp_config: Prisma.JsonValue | null;
        fallback_chain: Prisma.JsonValue | null;
        default_reminder_channels: Prisma.JsonValue | null;
        daily_message_limit: number;
        send_rate_per_minute: number;
        dnd_start: string | null;
        dnd_end: string | null;
    }>;
    updateClinicSettings(clinicId: string, dto: UpdateClinicSettingsDto, options?: {
        skipFeatureCheck?: boolean;
    }): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        google_review_url: string | null;
        enable_email: boolean;
        enable_sms: boolean;
        enable_whatsapp: boolean;
        email_provider: string | null;
        email_config: Prisma.JsonValue | null;
        sms_provider: string | null;
        sms_config: Prisma.JsonValue | null;
        whatsapp_provider: string | null;
        whatsapp_config: Prisma.JsonValue | null;
        fallback_chain: Prisma.JsonValue | null;
        default_reminder_channels: Prisma.JsonValue | null;
        daily_message_limit: number;
        send_rate_per_minute: number;
        dnd_start: string | null;
        dnd_end: string | null;
    }>;
    getMessageStats(clinicId: string, startDate?: string, endDate?: string): Promise<{
        total: number;
        delivery_rate: number;
        failure_rate: number;
        by_channel: {
            channel: string;
            count: number;
        }[];
        by_status: {
            status: string;
            count: number;
        }[];
        by_category: {
            category: string;
            count: number;
        }[];
        metrics: {
            sent: number;
            delivered: number;
            failed: number;
            skipped: number;
        };
        daily_trend: {
            date: string;
            count: number;
            delivered: number;
            failed: number;
        }[];
    }>;
    sendTestEmail(clinicId: string, to: string): Promise<{
        message: string;
        to: string;
        provider_message_id: string | undefined;
    }>;
    sendTestSms(clinicId: string, to: string, dltTemplateId?: string, variables?: Record<string, string>): Promise<{
        message: string;
        to: string;
        dlt_template_id: string;
        body_sent: string;
        provider_message_id: string | undefined;
    }>;
    verifySmtp(clinicId: string): Promise<{
        ok: boolean;
        error?: string;
    }>;
    handleChannelFallback(messageId: string, failedChannel: string): Promise<boolean>;
    private getOrCreateClinicSettings;
    private isChannelEnabled;
    private checkPatientPreferences;
    private checkDndHours;
    private getNextValidWindow;
    private checkDeduplication;
    private getRecipient;
    private createSkippedMessage;
    private timeToMinutes;
    private ensureProvidersConfigured;
    private loadAndConfigureProviders;
    private configureProviders;
    private sanitizeTextBody;
    private renderEmailHtml;
    private escapeHtml;
    private static readonly CIRCUIT_BREAKER_WINDOW;
    private static readonly CIRCUIT_BREAKER_THRESHOLD;
    private static readonly CIRCUIT_BREAKER_MIN_SAMPLE;
    private static readonly CIRCUIT_BREAKER_LOOKBACK_MS;
    getCircuitBreakerStatus(clinicId: string): Promise<Record<string, {
        is_open: boolean;
        failure_rate: number;
        sample_size: number;
    }>>;
    private isCircuitOpen;
    private hasClinicFeature;
    handleSmsDeliveryWebhook(payload: Record<string, unknown>): Promise<{
        processed: number;
        status?: undefined;
    } | {
        processed: number;
        status: string;
    }>;
    handleWhatsAppWebhook(payload: Record<string, unknown>): Promise<{
        processed: number;
    }>;
    private processMetaStatusUpdate;
    private processMetaIncomingMessage;
    getInboxConversations(clinicId: string, page?: number, limit?: number): Promise<{
        data: {
            phone: string;
            patient_id: string | null;
            patient_name: string;
            last_message: string;
            last_at: Date;
            last_direction: string;
            last_status: string;
            last_inbound_at: Date | null;
            unread_count: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
        };
    }>;
    getConversationMessages(clinicId: string, phone: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            status: string;
            created_at: Date;
            body: string;
            metadata: Prisma.JsonValue;
            template: {
                template_name: string;
            } | null;
            direction: string;
            wa_message_id: string | null;
            sent_at: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
        };
    }>;
    sendInboxReply(clinicId: string, phone: string, body: string): Promise<{
        success: boolean;
        message_id: string;
    }>;
    private queueMetaReadReceipts;
    private sendMetaReadReceipts;
    checkNdncStatus(phone: string): Promise<{
        is_ndnc: boolean;
        checked: boolean;
        message: string;
    }>;
    submitWhatsAppTemplate(clinicId: string, templateData: {
        elementName: string;
        languageCode: string;
        category: string;
        templateType: string;
        body: string;
        header?: string;
        footer?: string;
    }): Promise<{
        success: boolean;
        templateId?: string;
        error?: string;
    }>;
    syncWhatsAppTemplates(clinicId: string): Promise<{
        success: boolean;
        error: string | undefined;
        synced: number;
        total_from_meta?: undefined;
        created?: undefined;
        updated?: undefined;
        deleted?: undefined;
        skipped?: undefined;
    } | {
        success: boolean;
        total_from_meta: number;
        created: number;
        updated: number;
        deleted: number;
        skipped: number;
        error?: undefined;
        synced?: undefined;
    }>;
    getWhatsAppTemplateStatus(clinicId: string, templateName: string): Promise<{
        status: string;
        rejectedReason?: string;
    }>;
    deleteWhatsAppTemplateFromMeta(clinicId: string, localTemplateId: string): Promise<{
        success: boolean;
        error: string | undefined;
        local_deleted: boolean;
    } | {
        success: boolean;
        local_deleted: boolean;
        error?: undefined;
    }>;
    editWhatsAppTemplateOnMeta(clinicId: string, localTemplateId: string, updateData: {
        body: string;
        header?: string;
        footer?: string;
        category?: string;
    }): Promise<{
        success: boolean;
        error: string | undefined;
    } | {
        success: boolean;
        error?: undefined;
    }>;
    renderRichEmailHtml(body: string, subject?: string, options?: {
        clinicName?: string;
        clinicLogo?: string;
        footerText?: string;
        ctaText?: string;
        ctaUrl?: string;
        preheader?: string;
    }): string;
    private static readonly META_GRAPH_API;
    completeWhatsAppEmbeddedSignup(clinicId: string, code?: string, accessToken?: string, sessionPhoneNumberId?: string, sessionWabaId?: string, _redirectUri?: string): Promise<{
        success: boolean;
        waba_id: string;
        phone_number_id: string;
        display_phone: string;
        verified_name: string;
        quality_rating: string;
    }>;
    private fetchFirstPhoneFromWaba;
    disconnectWhatsApp(clinicId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
