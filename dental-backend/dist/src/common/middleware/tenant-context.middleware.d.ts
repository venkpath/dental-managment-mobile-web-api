import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare const CLINIC_HEADER = "x-clinic-id";
export declare class TenantContextMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void;
}
