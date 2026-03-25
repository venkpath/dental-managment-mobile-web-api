import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { PasswordService } from '../common/services/password.service.js';
export declare class DatabaseSeederService implements OnModuleInit {
    private readonly prisma;
    private readonly passwordService;
    private readonly logger;
    constructor(prisma: PrismaService, passwordService: PasswordService);
    onModuleInit(): Promise<void>;
    private seedTeeth;
    private seedSurfaces;
    private seedSuperAdmin;
    private seedPlans;
    private seedFeatures;
    private seedPlanFeatures;
    private seedTestClinic;
}
