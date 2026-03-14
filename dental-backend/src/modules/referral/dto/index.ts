import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['discount_percentage', 'discount_flat', 'credit'])
  reward_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  reward_value?: number;

  @ApiPropertyOptional({ description: 'Custom message when referring' })
  @IsOptional()
  @IsString()
  referral_message?: string;
}

export class CompleteReferralDto {
  @IsString()
  referral_code!: string;

  @IsString()
  referred_patient_id!: string;
}
