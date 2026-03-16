import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * Blocks clinic users from accessing protected endpoints when their
 * trial has expired and they have no active paid subscription.
 *
 * Skips: @Public() routes, super_admin users (no clinic_id).
 * Allowed statuses: trial (if not expired), active, created (payment pending).
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip if no user (handled by JwtAuthGuard) or super_admin
    if (!user || !user.clinicId) return true;

    // Allow payment endpoints so expired clinics can still subscribe
    const path = request.originalUrl || request.url || '';
    if (path.includes('/payment') || path.includes('/auth')) return true;

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { subscription_status: true, trial_ends_at: true },
    });

    if (!clinic) return true;

    const { subscription_status, trial_ends_at } = clinic;

    // Active or pending payment — allow
    if (subscription_status === 'active' || subscription_status === 'created') {
      return true;
    }

    // Trial — check if still within trial period
    if (subscription_status === 'trial') {
      if (trial_ends_at && new Date(trial_ends_at) > new Date()) {
        return true;
      }
      throw new ForbiddenException(
        'Your 14-day free trial has ended. Please subscribe to a plan to continue using the application.',
      );
    }

    // expired, cancelled, or unknown
    throw new ForbiddenException(
      'Your subscription is inactive. Please subscribe to a plan to continue using the application.',
    );
  }
}
