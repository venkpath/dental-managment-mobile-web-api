import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto.js';

export class UpdateBranchDto extends PartialType(
  OmitType(CreateBranchDto, ['clinic_id'] as const),
) {}
