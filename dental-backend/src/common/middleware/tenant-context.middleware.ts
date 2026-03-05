import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const CLINIC_HEADER = 'x-clinic-id';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const clinicId = req.headers[CLINIC_HEADER];

    if (typeof clinicId === 'string' && clinicId.length > 0) {
      req.clinicId = clinicId;
    }

    next();
  }
}
