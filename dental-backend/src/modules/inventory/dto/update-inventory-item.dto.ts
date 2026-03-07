import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateInventoryItemDto } from './create-inventory-item.dto.js';

export class UpdateInventoryItemDto extends PartialType(
  OmitType(CreateInventoryItemDto, ['branch_id'] as const),
) {}
