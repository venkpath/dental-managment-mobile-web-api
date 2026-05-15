import { IsString, IsNumber, IsInt, IsOptional, MaxLength, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Basic', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 999, description: 'Monthly price in INR (GST-inclusive)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price_monthly!: number;

  @ApiPropertyOptional({ example: 9999, description: 'Yearly price in INR (GST-inclusive). Null = monthly only.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price_yearly?: number;

  @ApiProperty({ example: 3, description: 'Maximum number of branches allowed' })
  @IsInt()
  @Min(1)
  max_branches!: number;

  @ApiProperty({ example: 10, description: 'Maximum number of staff members allowed' })
  @IsInt()
  @Min(1)
  max_staff!: number;

  @ApiPropertyOptional({ example: 100, description: 'Base AI requests included per cycle (0 = no AI access)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ai_quota?: number;

  @ApiPropertyOptional({ example: 50, description: 'Max additional (pay-per-use) AI requests allowed beyond ai_quota per cycle (0 = no overage)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ai_overage_cap?: number;

  @ApiPropertyOptional({ description: 'Max patients per month (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_patients_per_month?: number;

  @ApiPropertyOptional({ description: 'Max appointments per month (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_appointments_per_month?: number;

  @ApiPropertyOptional({ description: 'Max invoices per month (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_invoices_per_month?: number;

  @ApiPropertyOptional({ description: 'Max treatments per month (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_treatments_per_month?: number;

  @ApiPropertyOptional({ description: 'Max prescriptions per month (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_prescriptions_per_month?: number;

  @ApiPropertyOptional({ description: 'Max consultations per month (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_consultations_per_month?: number;

  @ApiPropertyOptional({ example: 'plan_XXXXXXXXXXXXX', description: 'Razorpay monthly subscription plan ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  razorpay_plan_id?: string;

  @ApiPropertyOptional({ example: 'plan_YYYYYYYYYYYYY', description: 'Razorpay yearly subscription plan ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  razorpay_plan_id_yearly?: string;

  @ApiPropertyOptional({ description: 'WhatsApp messages included per month (null = unlimited / BYO WABA)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  whatsapp_included_monthly?: number;

  @ApiPropertyOptional({ description: 'Hard cap that blocks further WA sends (null = no block, overage allowed)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  whatsapp_hard_limit_monthly?: number;

  @ApiPropertyOptional({ description: 'Track WhatsApp overage for billing via payment link', default: false })
  @IsOptional()
  @IsBoolean()
  allow_whatsapp_overage_billing?: boolean;
}
