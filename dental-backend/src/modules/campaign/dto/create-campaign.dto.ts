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
      'Values for custom (non-system) template variables. Same value sent to every recipient. ' +
      'System variables like patient_name and clinic_name are auto-filled and should NOT be included here.',
    example: { festival_name: 'Ugadi', offer_details: 'Get 20% off cleaning this week!' },
  })
  @IsOptional()
  @IsObject()
  template_variables?: Record<string, string>;
}
