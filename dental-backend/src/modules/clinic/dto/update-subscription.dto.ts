import { IsEnum, IsIn, IsOptional, IsUUID, IsDateString, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Plan ID (FK to plans)' })
  @IsOptional()
  @IsUUID()
  plan_id?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscription_status?: SubscriptionStatus;

  @ApiPropertyOptional({
    enum: ['monthly', 'yearly'],
    description:
      'Switch the clinic between monthly and yearly billing. The next renewal cron uses this to decide the period length and amount. Pair with next_billing_at when you want the next invoice to fire on a specific date.',
  })
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billing_cycle?: 'monthly' | 'yearly';

  @ApiPropertyOptional({
    example: '2026-12-01T00:00:00.000Z',
    description:
      'When the next renewal invoice should be issued. Set this whenever you flip billing_cycle so the renewal cron fires on the right date (otherwise the previously-stored anniversary will be wrong). Send null to clear.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  next_billing_at?: string | null;

  @ApiPropertyOptional({ example: '2026-04-06T00:00:00.000Z', description: 'Trial end date' })
  @IsOptional()
  @IsDateString()
  trial_ends_at?: string;

  @ApiPropertyOptional({ example: 0, description: 'Reset AI usage count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ai_usage_count?: number;

  @ApiPropertyOptional({ example: true, description: 'Complimentary access — no payment required' })
  @IsOptional()
  @IsBoolean()
  is_complimentary?: boolean;
}
