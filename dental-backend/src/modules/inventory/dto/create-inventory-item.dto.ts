import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Branch ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  branch_id!: string;

  @ApiProperty({ description: 'Item name', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Item category', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ description: 'Current quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ description: 'Unit of measurement (e.g. pcs, ml, box)', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiPropertyOptional({ description: 'Reorder level threshold', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  reorder_level?: number;

  @ApiPropertyOptional({ description: 'Supplier name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplier?: string;
}
