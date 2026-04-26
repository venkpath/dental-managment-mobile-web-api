import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TRACK_AI_USAGE_KEY } from '../decorators/track-ai-usage.decorator.js';
import { AiUsageService } from '../../modules/ai/ai-usage.service.js';

/**
 * AiUsageGuard
 *
 * Pre-flight check + atomic slot reservation for AI requests. The actual
 * token-level usage is recorded by AiService after the OpenAI call returns.
 * If the OpenAI call fails, AiService releases the reservation.
 */
@Injectable()
export class AiUsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly aiUsageService: AiUsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const trackUsage = this.reflector.getAllAndOverride<boolean | undefined>(
      TRACK_AI_USAGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!trackUsage) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // Super admins bypass quota enforcement
    if (request.superAdmin) return true;

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    await this.aiUsageService.reserveSlot(user.clinicId);
    return true;
  }
}
