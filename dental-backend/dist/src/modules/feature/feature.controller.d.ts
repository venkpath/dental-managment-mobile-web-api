import { FeatureService } from './feature.service.js';
import { CreateFeatureDto } from './dto/index.js';
export declare class FeatureController {
    private readonly featureService;
    constructor(featureService: FeatureService);
    create(dto: CreateFeatureDto): Promise<{
        id: string;
        created_at: Date;
        key: string;
        description: string;
    }>;
    findAll(): Promise<{
        id: string;
        created_at: Date;
        key: string;
        description: string;
    }[]>;
    remove(id: string): Promise<{
        id: string;
        created_at: Date;
        key: string;
        description: string;
    }>;
}
