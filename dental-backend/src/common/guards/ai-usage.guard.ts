import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service.js';
import { TRACK_AI_USAGE_KEY } from '../decorators/track-ai-usage.decorator.js';

const DEFAULT_AI_QUOTA = 500;

@Injectable()
export class AiUsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const trackUsage = this.reflector.getAllAndOverride<boolean | undefined>(
      TRACK_AI_USAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!trackUsage) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Super admins bypass usage tracking
    if (request.superAdmin) {
      return true;
    }

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { id: true, plan_id: true, ai_quota_override: true, ai_usage_count: true },
    });

    if (!clinic || !clinic.plan_id) {
      throw new ForbiddenException('AI features require an active subscription plan');
    }

    // Resolve effective quota with priority: clinic override > global setting > default 500
    const effectiveQuota = await this.resolveQuota(clinic.ai_quota_override);

    // Atomic increment with quota check to prevent race conditions
    if (effectiveQuota > 0) {
      const result = await this.prisma.clinic.updateMany({
        where: {
          id: clinic.id,
          ai_usage_count: { lt: effectiveQuota },
        },
        data: { ai_usage_count: { increment: 1 } },
      });

      if (result.count === 0) {
        throw new ForbiddenException(
          `AI usage quota exceeded (${effectiveQuota} requests). Contact your administrator to increase the limit.`,
        );
      }
    } else {
      // Unlimited quota (effectiveQuota === 0), just increment
      await this.prisma.clinic.update({
        where: { id: clinic.id },
        data: { ai_usage_count: { increment: 1 } },
      });
    }

    return true;
  }

  /**
   * Resolve the effective AI quota with priority:
   * 1. Clinic-level override (ai_quota_override on Clinic model) — highest priority
   * 2. Global setting (global_ai_quota in GlobalSetting table)
   * 3. Default fallback (500)
   *
   * A value of 0 means unlimited.
   */
  private async resolveQuota(clinicOverride: number | null): Promise<number> {
    // Priority 1: Clinic-level override
    if (clinicOverride !== null && clinicOverride !== undefined) {
      return clinicOverride;
    }

    // Priority 2: Global setting
    try {
      const globalSetting = await this.prisma.globalSetting.findUnique({
        where: { key: 'global_ai_quota' },
      });
      if (globalSetting?.value) {
        const parsed = parseInt(globalSetting.value, 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Table may not exist yet during migration, fall through to default
    }

    // Priority 3: Default
    return DEFAULT_AI_QUOTA;
  }
}
