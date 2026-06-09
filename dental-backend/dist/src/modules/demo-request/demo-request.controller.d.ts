import { DemoRequestService } from './demo-request.service.js';
import { CreateDemoRequestDto, CreateDemoRequestFromAppDto, UpdateDemoStatusDto } from './dto/demo-request.dto.js';
interface RequestUser {
    userId: string;
    clinicId: string;
}
export declare class DemoRequestController {
    private readonly demoRequestService;
    constructor(demoRequestService: DemoRequestService);
    create(dto: CreateDemoRequestDto): Promise<{
        success: boolean;
        message: string;
        id: string;
    }>;
    getAvailableSlots(date: string): Promise<{
        date: string;
        timezone: string;
        window: string;
        lunch_block: string;
        slots: import("./demo-slots.util.js").DemoSlotAvailability[];
    }>;
    createFromApp(user: RequestUser, dto: CreateDemoRequestFromAppDto): Promise<{
        success: boolean;
        id: string;
    }>;
    findAll(status?: string): Promise<{
        id: string;
        email: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string | null;
        clinic_name: string | null;
        notes: string | null;
        source: string;
        scheduled_at: Date | null;
        chairs: string | null;
        meeting_link: string | null;
        preferred_date: string | null;
        preferred_slot: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string | null;
        clinic_name: string | null;
        notes: string | null;
        source: string;
        scheduled_at: Date | null;
        chairs: string | null;
        meeting_link: string | null;
        preferred_date: string | null;
        preferred_slot: string | null;
    }>;
    updateStatus(id: string, dto: UpdateDemoStatusDto): Promise<{
        id: string;
        email: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string | null;
        clinic_name: string | null;
        notes: string | null;
        source: string;
        scheduled_at: Date | null;
        chairs: string | null;
        meeting_link: string | null;
        preferred_date: string | null;
        preferred_slot: string | null;
    }>;
}
export {};
