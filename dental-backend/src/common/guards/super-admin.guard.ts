import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_SUPER_ADMIN_KEY } from '../decorators/super-admin.decorator.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isSuperAdmin = this.reflector.getAllAndOverride<boolean>(
      IS_SUPER_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isSuperAdmin) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.superAdmin) {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
