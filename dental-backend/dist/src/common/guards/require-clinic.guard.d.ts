import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class RequireClinicGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
