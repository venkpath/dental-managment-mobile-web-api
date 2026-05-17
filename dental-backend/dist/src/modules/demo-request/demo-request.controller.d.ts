import { DemoRequestService } from './demo-request.service.js';
import { CreateDemoRequestDto, UpdateDemoStatusDto } from './dto/demo-request.dto.js';
export declare class DemoRequestController {
    private readonly demoRequestService;
    constructor(demoRequestService: DemoRequestService);
    create(dto: CreateDemoRequestDto): Promise<{
        success: boolean;
        message: string;
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
        clinic_name: string | null;
        source: string;
        scheduled_at: Date | null;
        notes: string | null;
        chairs: string | null;
        meeting_link: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_name: string | null;
        source: string;
        scheduled_at: Date | null;
        notes: string | null;
        chairs: string | null;
        meeting_link: string | null;
    }>;
    updateStatus(id: string, dto: UpdateDemoStatusDto): Promise<{
        id: string;
        email: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_name: string | null;
        source: string;
        scheduled_at: Date | null;
        notes: string | null;
        chairs: string | null;
        meeting_link: string | null;
    }>;
}
