import { HealthService } from './health.service.js';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    check(): {
        status: string;
    };
    detailed(): Promise<import("@nestjs/terminus").HealthCheckResult>;
    ready(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
