import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { WhatsAppProvider } from '../communication/providers/whatsapp.provider.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { NotificationService } from '../notification/notification.service.js';
import { PushNotificationService } from '../notification/push-notification.service.js';
import type { CreateSupportTicketDto, UpdateSupportTicketDto, AddTicketCommentDto } from './dto/index.js';
interface SubmitterContext {
    userId: string;
    clinicId: string;
}
export declare class SupportTicketService {
    private readonly prisma;
    private readonly whatsapp;
    private readonly emailProvider;
    private readonly config;
    private readonly notificationService;
    private readonly pushNotificationService;
    private readonly logger;
    private readonly adminPhone;
    private readonly adminEmail;
    constructor(prisma: PrismaService, whatsapp: WhatsAppProvider, emailProvider: EmailProvider, config: ConfigService, notificationService: NotificationService, pushNotificationService: PushNotificationService);
    create(ctx: SubmitterContext, dto: CreateSupportTicketDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        clinic_name: string | null;
        user_name: string;
        category: string;
        subject: string;
        message: string;
        user_id: string;
        admin_notes: string | null;
        user_email: string;
        user_phone: string | null;
        resolved_at: Date | null;
    }>;
    listMine(ctx: SubmitterContext): Promise<{
        id: string;
        status: string;
        created_at: Date;
        category: string;
        subject: string;
        resolved_at: Date | null;
    }[]>;
    listAll(status?: string): Promise<({
        comments: {
            created_at: Date;
            author_type: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        clinic_name: string | null;
        user_name: string;
        category: string;
        subject: string;
        message: string;
        user_id: string;
        admin_notes: string | null;
        user_email: string;
        user_phone: string | null;
        resolved_at: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        clinic_name: string | null;
        user_name: string;
        category: string;
        subject: string;
        message: string;
        user_id: string;
        admin_notes: string | null;
        user_email: string;
        user_phone: string | null;
        resolved_at: Date | null;
    }>;
    findOneWithComments(id: string): Promise<{
        comments: {
            id: string;
            created_at: Date;
            message: string;
            ticket_id: string;
            author_type: string;
            author_id: string | null;
            author_name: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        clinic_name: string | null;
        user_name: string;
        category: string;
        subject: string;
        message: string;
        user_id: string;
        admin_notes: string | null;
        user_email: string;
        user_phone: string | null;
        resolved_at: Date | null;
    }>;
    update(id: string, dto: UpdateSupportTicketDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        clinic_name: string | null;
        user_name: string;
        category: string;
        subject: string;
        message: string;
        user_id: string;
        admin_notes: string | null;
        user_email: string;
        user_phone: string | null;
        resolved_at: Date | null;
    }>;
    getTicketWithComments(ticketId: string, clinicId: string): Promise<{
        comments: {
            id: string;
            created_at: Date;
            message: string;
            ticket_id: string;
            author_type: string;
            author_id: string | null;
            author_name: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        clinic_name: string | null;
        user_name: string;
        category: string;
        subject: string;
        message: string;
        user_id: string;
        admin_notes: string | null;
        user_email: string;
        user_phone: string | null;
        resolved_at: Date | null;
    }>;
    addUserComment(ticketId: string, clinicId: string, userId: string, dto: AddTicketCommentDto): Promise<{
        id: string;
        created_at: Date;
        message: string;
        ticket_id: string;
        author_type: string;
        author_id: string | null;
        author_name: string;
    }>;
    addAdminComment(ticketId: string, adminName: string, dto: AddTicketCommentDto): Promise<{
        id: string;
        created_at: Date;
        message: string;
        ticket_id: string;
        author_type: string;
        author_id: string | null;
        author_name: string;
    }>;
    listComments(ticketId: string): Promise<{
        id: string;
        created_at: Date;
        message: string;
        ticket_id: string;
        author_type: string;
        author_id: string | null;
        author_name: string;
    }[]>;
    private ensureEmailConfigured;
    private ensureWhatsAppConfigured;
    private sendAdminAlert;
    private sendAdminAlertEmail;
    private sendUserReplyAlertEmail;
}
export {};
