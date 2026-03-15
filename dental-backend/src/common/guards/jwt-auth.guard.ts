import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { JwtPayload, SuperAdminJwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload | SuperAdminJwtPayload>(token);

      if (payload.type === 'super_admin') {
        request.superAdmin = { id: payload.sub };
      } else {
        const userPayload = payload as JwtPayload;
        request.user = {
          userId: userPayload.sub,
          clinicId: userPayload.clinic_id,
          role: userPayload.role,
          branchId: userPayload.branch_id,
        };
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    // 1. Prefer Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    // 2. Fall back to secure httpOnly cookie
    const cookieToken = request.cookies?.['access_token'] as string | undefined;
    if (cookieToken) return cookieToken;

    return undefined;
  }
}
