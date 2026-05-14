import { TutorialService } from './tutorial.service.js';
import { CreateTutorialDto, UpdateTutorialDto } from './dto/index.js';
export declare class SuperAdminTutorialController {
    private readonly service;
    constructor(service: TutorialService);
    list(): Promise<{
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
    create(dto: CreateTutorialDto): Promise<{
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
    update(id: string, dto: UpdateTutorialDto): Promise<{
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
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
