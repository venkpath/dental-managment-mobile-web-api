import { SupportTicketService } from './support-ticket.service.js';
import { CreateSupportTicketDto, UpdateSupportTicketDto } from './dto/index.js';
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
    listAll(status?: string): Promise<{
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
    }[]>;
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
}
export {};
