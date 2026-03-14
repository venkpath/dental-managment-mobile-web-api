import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsEnum, Matches } from 'class-validator';

export enum PreferredChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_email?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_sms?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_whatsapp?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_marketing?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allow_reminders?: boolean;

  @ApiPropertyOptional({ enum: PreferredChannel, example: 'whatsapp' })
  @IsOptional()
  @IsEnum(PreferredChannel)
  preferred_channel?: PreferredChannel;

  @ApiPropertyOptional({ example: '21:00', description: 'Quiet hours start (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quiet_hours_start must be in HH:mm format' })
  quiet_hours_start?: string;

  @ApiPropertyOptional({ example: '09:00', description: 'Quiet hours end (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quiet_hours_end must be in HH:mm format' })
  quiet_hours_end?: string;
}
