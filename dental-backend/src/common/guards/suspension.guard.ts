import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class SuspensionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const clinicId = request.user?.clinicId;
    if (!clinicId) return true; // super admin token or not yet authenticated

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { is_suspended: true },
    });

    if (clinic?.is_suspended) {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact Smart Dental Desk support to reactivate.',
      });
    }

    return true;
  }
}
