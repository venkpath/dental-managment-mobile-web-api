import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
export declare class DisplayTokenService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    private generateToken;
    private getBaseUrl;
    generate(clinicId: string, branchId: string): Promise<{
        token: string;
        display_url: string;
        branch_name: string;
        enabled: boolean;
    }>;
    get(clinicId: string, branchId: string): Promise<{
        enabled: boolean;
        token: null;
        display_url: null;
        branch_name: string;
    } | {
        token: string;
        display_url: string;
        branch_name: string;
        enabled: boolean;
    }>;
    revoke(clinicId: string, branchId: string): Promise<{
        message: string;
    }>;
}
