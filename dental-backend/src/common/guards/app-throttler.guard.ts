import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLER_LIMIT, THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants.js';
import type { Request } from 'express';

type AuthUser = { userId?: string; clinicId?: string };

/**
 * Opt-in rate limiting: clinic/mobile CRUD routes are NOT throttled.
 * Only routes decorated with @Throttle(...) are counted (auth, OTP, public consent, etc.).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    const skip = this.reflector.getAllAndOverride<boolean | Record<string, boolean>>(
      THROTTLER_SKIP,
      [handler, classRef],
    );
    if (skip === true) return true;

    for (const namedThrottler of this.throttlers) {
      const limit = this.reflector.getAllAndOverride<number>(
        THROTTLER_LIMIT + namedThrottler.name,
        [handler, classRef],
      );
      if (limit != null) return false;
    }
    return true;
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request & { user?: AuthUser };
    const user = request.user;
    if (user?.userId) {
      const clinic = user.clinicId ?? 'no-clinic';
      return `user:${user.userId}:clinic:${clinic}`;
    }
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';
    return `ip:${ip}`;
  }
}
