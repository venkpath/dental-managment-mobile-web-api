import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsIn,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiPropertyOptional({ description: 'Branch ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiProperty({ description: 'Expense category ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  category_id!: string;

  @ApiProperty({ description: 'Expense title', maxLength: 255, example: 'April Clinic Rent' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Amount', example: 25000.00, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'Expense date (YYYY-MM-DD)', example: '2026-04-01' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({
    description: 'Payment mode',
    enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['cash', 'bank_transfer', 'upi', 'card', 'cheque'])
  payment_mode?: string;

  @ApiPropertyOptional({ description: 'Vendor / payee name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @ApiPropertyOptional({ description: 'Receipt file URL', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  receipt_url?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Is this a recurring expense', default: false })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurring frequency',
    enum: ['monthly', 'quarterly', 'yearly'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  recurring_frequency?: string;
}
