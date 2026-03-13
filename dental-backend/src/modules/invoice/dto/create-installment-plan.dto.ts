import {
  IsUUID,
  IsNumber,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InstallmentItemDto {
  @ApiProperty({ example: 1, description: 'Installment number (1-based)' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  installment_number!: number;

  @ApiProperty({ example: 8333.33, description: 'Amount for this installment' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: '2026-04-01', description: 'Due date (ISO date)' })
  @IsDateString()
  due_date!: string;
}

export class CreateInstallmentPlanDto {
  @ApiPropertyOptional({ description: 'Invoice UUID (set from URL param)' })
  @IsOptional()
  @IsUUID()
  invoice_id?: string;

  @ApiPropertyOptional({ example: 'RCT treatment – 3 installments', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [InstallmentItemDto], description: 'Planned installment schedule' })
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 installments are required' })
  @ValidateNested({ each: true })
  @Type(() => InstallmentItemDto)
  items!: InstallmentItemDto[];
}
