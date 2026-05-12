import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service.js';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const THROTTLE_MS = 60 * 60 * 1000; // update at most once per hour per clinic

@Injectable()
export class ActivityTrackerInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (WRITE_METHODS.has(request.method)) {
      const clinicId = request.user?.clinicId;
      if (clinicId) {
        const oneHourAgo = new Date(Date.now() - THROTTLE_MS);
        // Fire-and-forget: don't await so it never delays the response
        this.prisma.clinic.updateMany({
          where: {
            id: clinicId,
            is_suspended: false,
            OR: [
              { last_active_at: null },
              { last_active_at: { lt: oneHourAgo } },
            ],
          },
          data: {
            last_active_at: new Date(),
            // Reset reminder flags so a returning clinic gets fresh reminders
            // if it goes inactive again later
            inactivity_reminder_30_sent: false,
            inactivity_reminder_40_sent: false,
          },
        }).catch(() => undefined);
      }
    }

    return next.handle();
  }
}
