import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Locks a per-clinic discounted price (GST-inclusive INR) on the Clinic row.
 * Either field may be null independently: setting only custom_price_monthly
 * applies the discount on monthly billing while yearly stays at plan default,
 * and vice-versa. Both null → discount cleared (back to plan defaults).
 *
 * Amounts are TOTALS per cycle, not per-month equivalents:
 *   custom_price_monthly: 6999  ⇒ ₹6999 charged each monthly cycle
 *   custom_price_yearly:  69990 ⇒ ₹69990 charged each yearly cycle
 *
 * This differs from Plan.price_yearly (which stores a per-month yearly rate),
 * but is closer to how super admins think about discounted offers ("they pay
 * 6999 a month, period").
 */
export class SetClinicCustomPriceDto {
  @ApiProperty({
    description: 'Total INR billed per monthly cycle. null = clear the monthly discount.',
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  custom_price_monthly?: number | null;

  @ApiProperty({
    description: 'Total INR billed per yearly cycle. null = clear the yearly discount.',
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  custom_price_yearly?: number | null;

  @ApiPropertyOptional({
    description: 'ISO timestamp at which the discount auto-reverts (omit/null for permanent)',
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @ApiPropertyOptional({
    description: 'Free-text reason recorded on the clinic for support/finance traceability',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
