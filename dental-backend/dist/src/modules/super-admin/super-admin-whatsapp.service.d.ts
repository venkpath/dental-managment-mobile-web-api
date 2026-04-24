import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
export declare class SuperAdminWhatsAppService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    private getConfig;
    getStatus(): {
        connected: boolean;
        phoneNumberId: string | null;
        wabaId: string | null;
    };
    getConversations(page?: number, limit?: number): Promise<{
        data: {
            phone: string;
            contact_name: string;
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
    getConversationMessages(phone: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            status: string;
            created_at: Date;
            channel: string;
            template_name: string | null;
            body: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            direction: string;
            wa_message_id: string | null;
            sent_at: Date | null;
            from_phone: string;
            to_phone: string;
            contact_phone: string;
            contact_name: string | null;
            message_type: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
            normalized_phone: string;
        };
    }>;
    sendReply(phone: string, body: string): Promise<{
        success: boolean;
        message_id: string;
        error: string | undefined;
    }>;
    sendTemplate(params: {
        phone: string;
        templateName: string;
        languageCode?: string;
        bodyParams?: string[];
        contactName?: string;
    }): Promise<{
        success: boolean;
        message_id: string;
        error: string | undefined;
    }>;
    private sendToMeta;
    private sendReadReceipts;
    private normalizePhone;
    private phoneVariants;
}
