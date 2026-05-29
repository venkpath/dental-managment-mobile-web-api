import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
export declare class AppThrottlerGuard extends ThrottlerGuard {
    protected shouldSkip(context: ExecutionContext): Promise<boolean>;
    protected getTracker(req: Record<string, unknown>): Promise<string>;
}
