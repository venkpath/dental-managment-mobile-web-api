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

    const feature = await this.prisma.feature.findUnique({
      where: { key: featureKey },
      select: { id: true },
    });
    if (!feature) {
      throw new ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
    }

    // 1) Per-clinic override wins when present and unexpired (true = grant,
    //    false = revoke). Expired rows are treated as if they did not exist
    //    so the clinic transparently falls back to the plan default.
    const override = await this.prisma.clinicFeatureOverride.findUnique({
      where: { clinic_id_feature_id: { clinic_id: user.clinicId, feature_id: feature.id } },
      select: { is_enabled: true, expires_at: true },
    });
    if (override && (!override.expires_at || override.expires_at > new Date())) {
      if (override.is_enabled) return true;
      throw new ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
    }

    // 2) Fall back to the plan default.
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { plan_id: true },
    });

    if (!clinic || !clinic.plan_id) {
      throw new ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
    }

    const planFeature = await this.prisma.planFeature.findUnique({
      where: { plan_id_feature_id: { plan_id: clinic.plan_id, feature_id: feature.id } },
      select: { is_enabled: true },
    });

    if (!planFeature?.is_enabled) {
      throw new ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
    }

    return true;
  }
}
