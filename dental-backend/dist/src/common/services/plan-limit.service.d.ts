import { PrismaService } from '../../database/prisma.service.js';
type MonthlyResource = 'patients' | 'appointments';
export declare class PlanLimitService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    enforceMonthlyCap(clinicId: string, resource: MonthlyResource, additional?: number): Promise<void>;
}
export {};
