import { PrismaService } from '../../../database/prisma.service.js';
import { ClinicFeatureService } from '../../feature/clinic-feature.service.js';
declare class ToggleDto {
    enabled: boolean;
}
export declare class InsuranceModuleController {
    private readonly prisma;
    private readonly clinicFeatureService;
    constructor(prisma: PrismaService, clinicFeatureService: ClinicFeatureService);
    status(clinicId: string): Promise<{
        available: boolean;
        enabled: boolean;
        reason: string;
        plan_name?: undefined;
    } | {
        available: boolean;
        enabled: boolean;
        plan_name: string | null;
        reason?: undefined;
    }>;
    toggle(clinicId: string, dto: ToggleDto): Promise<{
        available: boolean;
        enabled: boolean;
    }>;
}
export {};
