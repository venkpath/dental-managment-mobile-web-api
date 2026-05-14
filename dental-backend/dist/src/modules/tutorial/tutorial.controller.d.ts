import { TutorialService } from './tutorial.service.js';
import { UpdateProgressDto } from './dto/index.js';
interface RequestUser {
    userId: string;
    clinicId: string;
    role: string;
    branchId: string | null;
}
export declare class TutorialController {
    private readonly service;
    constructor(service: TutorialService);
    list(user: RequestUser): Promise<{
        id: string;
        title: string;
        description: string | null;
        thumbnail_s3_key: string | null;
        duration_seconds: number | null;
        category: string | null;
        display_order: number;
        last_position_seconds: number;
        completed_at: Date | null;
    }[]>;
    getStreamUrl(id: string, user: RequestUser): Promise<{
        id: string;
        title: string;
        description: string | null;
        duration_seconds: number | null;
        category: string | null;
        video_url: string;
        thumbnail_url: string | null;
        last_position_seconds: number;
        completed_at: Date | null;
    }>;
    updateProgress(id: string, user: RequestUser, dto: UpdateProgressDto): Promise<{
        updated_at: Date;
        user_id: string;
        completed_at: Date | null;
        last_position_seconds: number;
        tutorial_id: string;
    }>;
}
export {};
