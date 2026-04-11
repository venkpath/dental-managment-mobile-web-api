import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CommunicationService } from './communication.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { QueryMessageDto } from './dto/query-message.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto.js';
import { WhatsAppEmbeddedSignupDto } from './dto/whatsapp-embedded-signup.dto.js';
export declare class OptOutController {
    private readonly communicationService;
    constructor(communicationService: CommunicationService);
    optOut(body: {
        token: string;
        channels?: string[];
    }, req: Request): Promise<{
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
    verify(token: string): Promise<{
        valid: boolean;
        patient_id: string;
    }>;
}
export declare class WebhookController {
    private readonly communicationService;
    private readonly configService;
    private readonly logger;
    constructor(communicationService: CommunicationService, configService: ConfigService);
    smsDeliveryReport(body: Record<string, unknown>): Promise<{
        processed: number;
        status?: undefined;
    } | {
        processed: number;
        status: string;
    }>;
    verifyWhatsAppWebhook(mode: string, verifyToken: string, challenge: string, res: Response): Response<any, Record<string, any>>;
    whatsappWebhook(req: Request, body: Record<string, unknown>): Promise<{
        processed: number;
    } | {
        error: string;
    }>;
}
export declare class CommunicationController {
    private readonly communicationService;
    constructor(communicationService: CommunicationService);
    sendMessage(clinicId: string, dto: SendMessageDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        channel: string;
        category: string;
        subject: string | null;
        body: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
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
            cost: import("@prisma/client-runtime-utils").Decimal | null;
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
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        patient_id: string | null;
        template_id: string | null;
        scheduled_at: Date | null;
        recipient: string;
        direction: string;
        skip_reason: string | null;
        wa_message_id: string | null;
        sent_at: Date | null;
    }>>;
    getStats(clinicId: string, startDate?: string, endDate?: string): Promise<{
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
            body: string;
            variables: import("@prisma/client/runtime/client").JsonValue | null;
            language: string;
            is_active: boolean;
            dlt_template_id: string | null;
            whatsapp_template_status: string | null;
        } | null;
        logs: {
            id: string;
            status: string;
            created_at: Date;
            channel: string;
            cost: import("@prisma/client-runtime-utils").Decimal | null;
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
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        patient_id: string | null;
        template_id: string | null;
        scheduled_at: Date | null;
        recipient: string;
        direction: string;
        skip_reason: string | null;
        wa_message_id: string | null;
        sent_at: Date | null;
    }>;
    getCircuitBreakerStatus(clinicId: string): Promise<Record<string, {
        is_open: boolean;
        failure_rate: number;
        sample_size: number;
    }>>;
    getPreferences(clinicId: string, patientId: string): Promise<{
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
    getPatientTimeline(clinicId: string, patientId: string, page?: string, limit?: string, channel?: string): Promise<{
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
                cost: import("@prisma/client-runtime-utils").Decimal | null;
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
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
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
    updatePreferences(clinicId: string, patientId: string, dto: UpdatePreferencesDto, req: Request): Promise<{
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
    getSettings(clinicId: string): Promise<{
        can_customize_providers: boolean;
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        enable_email: boolean;
        enable_sms: boolean;
        enable_whatsapp: boolean;
        email_provider: string | null;
        email_config: import("@prisma/client/runtime/client").JsonValue | null;
        sms_provider: string | null;
        sms_config: import("@prisma/client/runtime/client").JsonValue | null;
        whatsapp_provider: string | null;
        whatsapp_config: import("@prisma/client/runtime/client").JsonValue | null;
        fallback_chain: import("@prisma/client/runtime/client").JsonValue | null;
        default_reminder_channels: import("@prisma/client/runtime/client").JsonValue | null;
        daily_message_limit: number;
        send_rate_per_minute: number;
        google_review_url: string | null;
        dnd_start: string | null;
        dnd_end: string | null;
    }>;
    updateSettings(clinicId: string, dto: UpdateClinicSettingsDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        enable_email: boolean;
        enable_sms: boolean;
        enable_whatsapp: boolean;
        email_provider: string | null;
        email_config: import("@prisma/client/runtime/client").JsonValue | null;
        sms_provider: string | null;
        sms_config: import("@prisma/client/runtime/client").JsonValue | null;
        whatsapp_provider: string | null;
        whatsapp_config: import("@prisma/client/runtime/client").JsonValue | null;
        fallback_chain: import("@prisma/client/runtime/client").JsonValue | null;
        default_reminder_channels: import("@prisma/client/runtime/client").JsonValue | null;
        daily_message_limit: number;
        send_rate_per_minute: number;
        google_review_url: string | null;
        dnd_start: string | null;
        dnd_end: string | null;
    }>;
    ndncCheck(phone: string): Promise<{
        is_ndnc: boolean;
        checked: boolean;
        message: string;
    }>;
    sendTestEmail(clinicId: string, body: {
        to: string;
    }): Promise<{
        message: string;
        to: string;
        provider_message_id: string | undefined;
    }>;
    sendTestSms(clinicId: string, body: {
        to: string;
        dlt_template_id?: string;
        variables?: Record<string, string>;
    }): Promise<{
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
    syncWhatsAppTemplates(clinicId: string): Promise<{
        success: boolean;
        error: string | undefined;
        synced: number;
        total_from_meta?: undefined;
        created?: undefined;
        updated?: undefined;
        skipped?: undefined;
    } | {
        success: boolean;
        total_from_meta: number;
        created: number;
        updated: number;
        skipped: number;
        error?: undefined;
        synced?: undefined;
    }>;
    submitWhatsAppTemplate(clinicId: string, body: {
        elementName: string;
        languageCode: string;
        category: string;
        templateType?: string;
        body: string;
        header?: string;
        footer?: string;
    }): Promise<{
        success: boolean;
        templateId?: string;
        error?: string;
    }>;
    getWhatsAppTemplateStatus(clinicId: string, templateName: string): Promise<{
        status: string;
        rejectedReason?: string;
    }>;
    deleteWhatsAppTemplateFromMeta(clinicId: string, id: string): Promise<{
        success: boolean;
        error: string | undefined;
        local_deleted: boolean;
    } | {
        success: boolean;
        local_deleted: boolean;
        error?: undefined;
    }>;
    editWhatsAppTemplateOnMeta(clinicId: string, id: string, body: {
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
    completeEmbeddedSignup(clinicId: string, dto: WhatsAppEmbeddedSignupDto): Promise<{
        success: boolean;
        waba_id: string;
        phone_number_id: string;
        display_phone: string;
        verified_name: string;
        quality_rating: string;
    }>;
    disconnectWhatsApp(clinicId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getInboxConversations(clinicId: string, page?: string, limit?: string): Promise<{
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
    getConversationMessages(clinicId: string, phone: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            status: string;
            created_at: Date;
            body: string;
            metadata: import("@prisma/client/runtime/client").JsonValue;
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
    sendInboxReply(clinicId: string, phone: string, body: {
        message: string;
    }): Promise<{
        success: boolean;
        message_id: string;
    }>;
    startConversation(clinicId: string, body: {
        patient_id: string;
        template_id: string;
        variables?: Record<string, string>;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        channel: string;
        category: string;
        subject: string | null;
        body: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        patient_id: string | null;
        template_id: string | null;
        scheduled_at: Date | null;
        recipient: string;
        direction: string;
        skip_reason: string | null;
        wa_message_id: string | null;
        sent_at: Date | null;
    }>;
}
