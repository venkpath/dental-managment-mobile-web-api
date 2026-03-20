import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { randomBytes } from 'crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // CSRF protection is only needed for cookie-based auth. When the client
    // authenticates via Authorization header (Bearer token), CSRF is not
    // applicable because the browser never sends Bearer tokens automatically.
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) return true;

    // Safe methods don't need CSRF validation — generate token if missing
    if (SAFE_METHODS.has(request.method)) {
      this.ensureCsrfCookie(request);
      return true;
    }

    // State-changing methods: validate double-submit cookie
    const cookieToken = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const headerToken = request.headers[CSRF_HEADER] as string | undefined;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    return true;
  }

  private ensureCsrfCookie(request: Request): void {
    const res = (request as any).res;
    if (!request.cookies?.[CSRF_COOKIE] && res) {
      const token = randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // JS must read this cookie to send in header
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        path: '/',
      });
    }
  }
}
