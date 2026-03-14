import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';

export enum TemplateChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  ALL = 'all',
}

export enum TemplateCategory {
  REMINDER = 'reminder',
  GREETING = 'greeting',
  CAMPAIGN = 'campaign',
  TRANSACTIONAL = 'transactional',
  FOLLOW_UP = 'follow_up',
  REFERRAL = 'referral',
}

export class CreateTemplateDto {
  @ApiProperty({ enum: TemplateChannel, example: 'email' })
  @IsEnum(TemplateChannel)
  channel!: TemplateChannel;

  @ApiProperty({ enum: TemplateCategory, example: 'reminder' })
  @IsEnum(TemplateCategory)
  category!: TemplateCategory;

  @ApiProperty({ example: 'Appointment Reminder - 24hr' })
  @IsString()
  @MaxLength(255)
  template_name!: string;

  @ApiPropertyOptional({ example: 'Your appointment is tomorrow' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiProperty({
    example: 'Hi {{patient_name}}, your appointment is on {{appointment_date}} at {{appointment_time}} with {{dentist_name}}.',
  })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ example: ['patient_name', 'appointment_date', 'appointment_time', 'dentist_name'] })
  @IsOptional()
  variables?: string[];

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'DLT Template ID for SMS compliance' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dlt_template_id?: string;
}
