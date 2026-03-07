import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service.js';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator.js';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Super admins bypass feature checks
    if (request.superAdmin) {
      return true;
    }

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { plan_id: true },
    });

    if (!clinic || !clinic.plan_id) {
      throw new ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
    }

    const planFeature = await this.prisma.planFeature.findFirst({
      where: {
        plan_id: clinic.plan_id,
        feature: { key: featureKey },
        is_enabled: true,
      },
    });

    if (!planFeature) {
      throw new ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
    }

    return true;
  }
}
