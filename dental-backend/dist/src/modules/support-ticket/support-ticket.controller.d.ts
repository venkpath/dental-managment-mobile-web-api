import { SupportTicketService } from './support-ticket.service.js';
import { CreateSupportTicketDto, UpdateSupportTicketDto, AddTicketCommentDto } from './dto/index.js';
interface RequestUser {
    userId: string;
    clinicId: string;
    role: string;
    branchId: string | null;
}
export declare class SupportTicketController {
    private readonly service;
    constructor(service: SupportTicketService);
    create(user: RequestUser, dto: CreateSupportTicketDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
    }>;
    listMine(user: RequestUser): Promise<{
        id: string;
        status: string;
        created_at: Date;
        category: string;
        subject: string;
        resolved_at: Date | null;
    }[]>;
    getMyTicket(user: RequestUser, id: string): Promise<{
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
    addUserComment(user: RequestUser, id: string, dto: AddTicketCommentDto): Promise<{
        id: string;
        created_at: Date;
        message: string;
        ticket_id: string;
        author_type: string;
        author_id: string | null;
        author_name: string;
    }>;
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
    addAdminComment(admin: {
        id: string;
        name: string;
    }, id: string, dto: AddTicketCommentDto): Promise<{
        id: string;
        created_at: Date;
        message: string;
        ticket_id: string;
        author_type: string;
        author_id: string | null;
        author_name: string;
    }>;
}
export {};
