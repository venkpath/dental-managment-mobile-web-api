import { CampaignService } from './campaign.service.js';
import { PrismaService } from '../../database/prisma.service.js';
export declare class CampaignCronService {
    private readonly prisma;
    private readonly campaignService;
    private readonly logger;
    constructor(prisma: PrismaService, campaignService: CampaignService);
    executeScheduledCampaigns(): Promise<void>;
}
