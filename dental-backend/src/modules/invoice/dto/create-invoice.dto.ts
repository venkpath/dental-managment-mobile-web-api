import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  Min,
  Matches,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InvoiceStatus {
  PENDING = 'pending',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
}

export enum InvoiceItemType {
  TREATMENT = 'treatment',
  SERVICE = 'service',
  PHARMACY = 'pharmacy',
}

export class InvoiceItemDto {
  @ApiPropertyOptional({ description: 'Treatment UUID (optional – links line item to a treatment)' })
  @IsOptional()
  @IsUUID()
  treatment_id?: string;

  @ApiProperty({ example: 'service', enum: InvoiceItemType, description: 'Type of line item' })
  @IsEnum(InvoiceItemType)
  item_type!: InvoiceItemType;

  @ApiProperty({ example: 'Composite restoration – Tooth #14', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ example: 2500.0, description: 'Price per unit' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  unit_price!: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiPropertyOptional({ description: 'Treating dentist (User) UUID' })
  @IsOptional()
  @IsUUID()
  dentist_id?: string;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description:
      'Date the treatment was actually rendered. Use when the patient is being billed in a later month than the visit. ISO date (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  treatment_date?: string;

  @ApiPropertyOptional({
    example: '18%',
    description: 'Tax percentage to apply (e.g. 18 for 18% GST). 0 or omit for no tax.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  tax_percentage?: number;

  @ApiPropertyOptional({ example: 500.0, description: 'Flat discount amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  discount_amount?: number;

  @ApiPropertyOptional({
    example: '22AAAAA0000A1Z5',
    maxLength: 20,
    description: 'GST number (India). Format: 15-char alphanumeric.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gst_number must be a valid 15-character GSTIN',
  })
  gst_number?: string;

  @ApiPropertyOptional({
    example: { cgst: 9, sgst: 9 },
    description: 'Tax breakdown JSON (e.g. CGST/SGST split for India)',
  })
  @IsOptional()
  @IsObject()
  tax_breakdown?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: false,
    description:
      'When true, the invoice is saved as a DRAFT — not visible to the patient and freely editable. Defaults to false (immediately issued).',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  as_draft?: boolean;

  @ApiProperty({ type: [InvoiceItemDto], description: 'Line items for the invoice' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}
