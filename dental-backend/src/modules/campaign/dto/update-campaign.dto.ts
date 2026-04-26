import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsObject, IsDateString } from 'class-validator';

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['email', 'sms', 'whatsapp', 'all'] })
  @IsOptional()
  @IsEnum(['email', 'sms', 'whatsapp', 'all'])
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiPropertyOptional({ enum: ['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom'] })
  @IsOptional()
  @IsEnum(['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom'])
  segment_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  segment_config?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['draft', 'scheduled', 'paused', 'cancelled'] })
  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'paused', 'cancelled'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({
    description: 'Per-variable mapping for the selected template. See CreateCampaignDto.',
  })
  @IsOptional()
  @IsObject()
  template_variables?: Record<string, { type: 'system'; key: string } | { type: 'custom'; value: string } | string>;
}
