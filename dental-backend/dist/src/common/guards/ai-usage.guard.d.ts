import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiUsageService } from '../../modules/ai/ai-usage.service.js';
export declare class AiUsageGuard implements CanActivate {
    private readonly reflector;
    private readonly aiUsageService;
    constructor(reflector: Reflector, aiUsageService: AiUsageService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
