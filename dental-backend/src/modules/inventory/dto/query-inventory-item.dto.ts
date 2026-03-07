import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsBooleanString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryInventoryItemDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by branch ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'Search by item name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Show only items at or below reorder level', example: 'true' })
  @IsOptional()
  @IsBooleanString()
  low_stock?: string;
}
