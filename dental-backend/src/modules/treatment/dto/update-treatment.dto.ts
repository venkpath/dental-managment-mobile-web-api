import { IsOptional, IsEnum } from 'class-validator';
import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTreatmentDto, TreatmentStatus } from './create-treatment.dto.js';

export class UpdateTreatmentDto extends PartialType(
  OmitType(CreateTreatmentDto, ['branch_id', 'patient_id'] as const),
) {
  @ApiPropertyOptional({ example: 'completed', enum: TreatmentStatus })
  @IsOptional()
  @IsEnum(TreatmentStatus)
  status?: TreatmentStatus;
}
