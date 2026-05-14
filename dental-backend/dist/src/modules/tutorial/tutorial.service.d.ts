import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import type { CreateTutorialDto, UpdateTutorialDto, UpdateProgressDto } from './dto/index.js';
export declare class TutorialService {
    private readonly prisma;
    private readonly s3;
    constructor(prisma: PrismaService, s3: S3Service);
    createTutorial(dto: CreateTutorialDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        description: string | null;
        category: string | null;
        title: string;
        display_order: number;
        s3_key: string;
        thumbnail_s3_key: string | null;
        duration_seconds: number | null;
        allowed_roles: string[];
        is_published: boolean;
    }>;
    listAllForAdmin(): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        description: string | null;
        category: string | null;
        title: string;
        display_order: number;
        s3_key: string;
        thumbnail_s3_key: string | null;
        duration_seconds: number | null;
        allowed_roles: string[];
        is_published: boolean;
    }[]>;
    updateTutorial(id: string, dto: UpdateTutorialDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        description: string | null;
        category: string | null;
        title: string;
        display_order: number;
        s3_key: string;
        thumbnail_s3_key: string | null;
        duration_seconds: number | null;
        allowed_roles: string[];
        is_published: boolean;
    }>;
    deleteTutorial(id: string): Promise<{
        deleted: boolean;
    }>;
    listForUser(userId: string, userRole: string): Promise<{
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
    getStreamUrl(tutorialId: string, userId: string, userRole: string): Promise<{
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
    updateProgress(tutorialId: string, userId: string, userRole: string, dto: UpdateProgressDto): Promise<{
        updated_at: Date;
        user_id: string;
        completed_at: Date | null;
        last_position_seconds: number;
        tutorial_id: string;
    }>;
    private normalizeRoles;
    private canUserAccess;
    private assertKeyInPrefix;
}
