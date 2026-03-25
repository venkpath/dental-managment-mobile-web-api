import { HealthCheckService, HealthCheckResult, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service.js';
export declare class HealthService {
    private readonly health;
    private readonly memory;
    private readonly disk;
    private readonly prisma;
    constructor(health: HealthCheckService, memory: MemoryHealthIndicator, disk: DiskHealthIndicator, prisma: PrismaService);
    check(): {
        status: string;
    };
    checkDetailed(): Promise<HealthCheckResult>;
    checkReady(): Promise<HealthCheckResult>;
}
