import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export enum MessageChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app',
}

export enum MessageCategory {
  TRANSACTIONAL = 'transactional',
  PROMOTIONAL = 'promotional',
}

export class SendMessageDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ enum: MessageChannel, example: 'email' })
  @IsEnum(MessageChannel)
  channel!: MessageChannel;

  @ApiPropertyOptional({ enum: MessageCategory, default: 'transactional' })
  @IsOptional()
  @IsEnum(MessageCategory)
  category?: MessageCategory;

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiPropertyOptional({ description: 'Subject for email' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Message body (overrides template)' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  variables?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Schedule for later delivery' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({ description: 'Extra metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
