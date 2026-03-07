import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto.js';

export class UpdatePatientDto extends PartialType(
  OmitType(CreatePatientDto, ['branch_id'] as const),
) {}
