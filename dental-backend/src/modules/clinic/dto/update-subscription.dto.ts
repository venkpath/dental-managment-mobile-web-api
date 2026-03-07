import { IsEnum, IsOptional, IsUUID, IsDateString, IsInt, Min } from 'class-validator';
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

  @ApiPropertyOptional({ example: '2026-04-06T00:00:00.000Z', description: 'Trial end date' })
  @IsOptional()
  @IsDateString()
  trial_ends_at?: string;

  @ApiPropertyOptional({ example: 0, description: 'Reset AI usage count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ai_usage_count?: number;
}
