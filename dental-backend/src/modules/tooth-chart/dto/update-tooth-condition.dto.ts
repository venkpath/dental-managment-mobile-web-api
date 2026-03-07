import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateToothConditionDto } from './create-tooth-condition.dto.js';

export class UpdateToothConditionDto extends PartialType(
  OmitType(CreateToothConditionDto, ['branch_id', 'patient_id', 'tooth_id', 'diagnosed_by'] as const),
) {}
