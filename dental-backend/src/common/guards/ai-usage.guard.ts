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
      select: { id: true, plan_id: true },
    });

    if (!clinic || !clinic.plan_id) {
      throw new ForbiddenException('AI features require an active subscription plan');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: clinic.plan_id },
      select: { ai_quota: true },
    });

    if (!plan) {
      throw new ForbiddenException('AI features require an active subscription plan');
    }

    // Atomic increment with quota check to prevent race conditions
    if (plan.ai_quota > 0) {
      const result = await this.prisma.clinic.updateMany({
        where: {
          id: clinic.id,
          ai_usage_count: { lt: plan.ai_quota },
        },
        data: { ai_usage_count: { increment: 1 } },
      });

      if (result.count === 0) {
        throw new ForbiddenException('AI usage quota exceeded for your current plan');
      }
    } else {
      // Unlimited quota (ai_quota === 0), just increment
      await this.prisma.clinic.update({
        where: { id: clinic.id },
        data: { ai_usage_count: { increment: 1 } },
      });
    }

    return true;
  }
}
