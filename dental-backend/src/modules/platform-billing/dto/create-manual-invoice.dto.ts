import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

export class CreateManualInvoiceDto {
  @ApiProperty({ description: 'Clinic the invoice is billed to' })
  @IsUUID()
  clinic_id!: string;

  @ApiProperty({ description: 'Plan covered by this invoice' })
  @IsUUID()
  plan_id!: string;

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsIn(['monthly', 'yearly'])
  billing_cycle!: 'monthly' | 'yearly';

  @ApiProperty({ description: 'GST-inclusive total in INR rupees', example: 1180 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  total_amount!: number;

  @ApiProperty({ description: 'Start of the billing period covered (ISO date)', example: '2026-06-01' })
  @Type(() => Date)
  @IsDate()
  period_start!: Date;

  @ApiProperty({ description: 'End of the billing period covered (ISO date)', example: '2026-06-30' })
  @Type(() => Date)
  @IsDate()
  period_end!: Date;

  @ApiPropertyOptional({ description: 'When payment is expected. Defaults to +7 days from period start.', example: '2026-06-07' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  due_date?: Date;

  @ApiPropertyOptional({ description: 'Internal note (e.g. "Offline cheque #1234"). Not shown on PDF.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'If false, only create the invoice — do not generate a Pay link or send WhatsApp/Email.' })
  @IsOptional()
  @IsBoolean()
  send_immediately?: boolean;
}

export class CancelInvoiceDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation (appended to invoice notes).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class MarkPaidOfflineDto {
  @ApiPropertyOptional({ description: 'Cheque / UTR / cash receipt number. Stored on the invoice as `offline:<ref>`.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_reference?: string;

  @ApiPropertyOptional({ description: 'Free-text note (e.g. "Cheque received from Dr Rao, deposited 2026-05-15"). Appended to invoice notes.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
