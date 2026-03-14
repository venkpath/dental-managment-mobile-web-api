import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsInt, IsArray, Min, Max, MaxLength } from 'class-validator';

export class UpdateClinicSettingsDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  enable_email?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  enable_sms?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  enable_whatsapp?: boolean;

  @ApiPropertyOptional({ example: 'gmail' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  email_provider?: string;

  @ApiPropertyOptional({ description: 'Email SMTP config: { host, port, user, pass }' })
  @IsOptional()
  email_config?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'msg91' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sms_provider?: string;

  @ApiPropertyOptional({ description: 'SMS config: { api_key, sender_id, dlt_entity_id }' })
  @IsOptional()
  sms_config?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'gupshup' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsapp_provider?: string;

  @ApiPropertyOptional({ description: 'WhatsApp config: { api_key, phone_number_id, waba_id }' })
  @IsOptional()
  whatsapp_config?: Record<string, unknown>;

  @ApiPropertyOptional({ example: ['whatsapp', 'sms', 'email'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fallback_chain?: string[];

  @ApiPropertyOptional({ example: ['whatsapp', 'sms'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  default_reminder_channels?: string[];

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  daily_message_limit?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  send_rate_per_minute?: number;

  @ApiPropertyOptional({ example: 'https://g.page/r/your-clinic/review' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  google_review_url?: string;

  @ApiPropertyOptional({ example: '22:00', description: 'DND quiet hours start (HH:mm)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  dnd_start?: string;

  @ApiPropertyOptional({ example: '08:00', description: 'DND quiet hours end (HH:mm)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  dnd_end?: string;
}
