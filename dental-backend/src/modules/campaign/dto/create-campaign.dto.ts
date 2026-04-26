import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsObject, IsDateString, IsUrl, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Diwali Special Offer 2026' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['email', 'sms', 'whatsapp', 'all'], example: 'whatsapp' })
  @IsEnum(['email', 'sms', 'whatsapp', 'all'])
  channel!: string;

  @ApiPropertyOptional({ description: 'Template ID to use for this campaign' })
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiProperty({
    enum: ['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom'],
    example: 'all',
  })
  @IsEnum(['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom'])
  segment_type!: string;

  @ApiPropertyOptional({
    description: 'Segment filter config (e.g., { inactive_months: 3 } or { treatment: "RCT" })',
    example: { inactive_months: 6 },
  })
  @IsOptional()
  @IsObject()
  segment_config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Schedule campaign for a future datetime (ISO string)' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({
    description: 'URL for WhatsApp template URL buttons (e.g. booking page). Required when using a template with a "Visit Website" button.',
    example: 'https://www.smartdentaldesk.com/booking/smile',
    maxLength: 2000,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  button_url_suffix?: string;

  @ApiPropertyOptional({
    description:
      'Per-variable mapping for the selected template. Each entry is either a system key resolved per recipient, ' +
      'or a custom static text sent to everyone. A plain string is also accepted and treated as { type: "custom", value }.',
    example: {
      '1': { type: 'system', key: 'patient_name' },
      '2': { type: 'system', key: 'clinic_name' },
      '3': { type: 'custom', value: 'Get 20% off cleaning this week!' },
    },
  })
  @IsOptional()
  @IsObject()
  template_variables?: Record<string, { type: 'system'; key: string } | { type: 'custom'; value: string } | string>;
}
