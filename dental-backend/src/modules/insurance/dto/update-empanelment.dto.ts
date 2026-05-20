import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEmpanelmentDto } from './create-empanelment.dto.js';

// provider_id can't be changed on update — empanelment is unique per
// (clinic, provider). Delete + recreate if you really need to swap providers.
export class UpdateEmpanelmentDto extends PartialType(OmitType(CreateEmpanelmentDto, ['provider_id'] as const)) {}
