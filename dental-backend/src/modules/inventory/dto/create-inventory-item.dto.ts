import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  IsNumber,
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

  // === Packaging / UOM ===
  @ApiPropertyOptional({ description: 'Purchase unit (box, bottle, pack)', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchase_unit?: string;

  @ApiPropertyOptional({ description: 'Purchase price per purchase_unit (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  purchase_price?: number;

  @ApiPropertyOptional({ description: 'Intermediate pack unit (strip, sachet)', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pack_unit?: string;

  @ApiPropertyOptional({ description: 'Number of pack_units per purchase_unit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  packs_per_purchase?: number;

  @ApiPropertyOptional({ description: 'Dispensing units per pack_unit (or per purchase if no pack_unit)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  units_per_pack?: number;

  @ApiPropertyOptional({ description: 'Total dispensing units in one purchase (auto-calculated)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  units_in_purchase?: number;

  @ApiPropertyOptional({ description: 'Cost per dispensing unit (auto = purchase_price / units_in_purchase)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_price?: number;

  @ApiPropertyOptional({ description: 'Selling price per dispensing unit (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  selling_price?: number;

  @ApiPropertyOptional({ description: 'Markup percentage over cost price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  markup_percent?: number;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @Type(() => Date)
  expiry_date?: Date;

  @ApiPropertyOptional({ description: 'Batch / lot number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Storage location (shelf/cabinet)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
