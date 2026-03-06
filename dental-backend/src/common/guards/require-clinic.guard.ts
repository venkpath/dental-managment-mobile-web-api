import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RequireClinicGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.clinicId) {
      throw new BadRequestException(
        'Missing or invalid x-clinic-id header. A valid clinic UUID is required.',
      );
    }

    // Prevent tenant spoofing: ensure the x-clinic-id header matches the JWT clinic_id
    if (request.user && request.user.clinicId !== request.clinicId) {
      throw new ForbiddenException(
        'Clinic context mismatch: x-clinic-id header does not match your authenticated clinic.',
      );
    }

    return true;
  }
}
