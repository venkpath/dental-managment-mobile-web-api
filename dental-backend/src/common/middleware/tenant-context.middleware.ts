import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const CLINIC_HEADER = 'x-clinic-id';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const clinicId = req.headers[CLINIC_HEADER];

    if (typeof clinicId === 'string' && UUID_REGEX.test(clinicId)) {
      req.clinicId = clinicId;
    }

    next();
  }
}
