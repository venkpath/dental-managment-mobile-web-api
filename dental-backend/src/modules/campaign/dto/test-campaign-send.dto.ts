import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsObject, IsOptional, IsUrl, MaxLength } from 'class-validator';
import type { CampaignVariableMappingInput } from '../system-variables.js';

export class TestCampaignSendDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number to receive the test message' })
  @IsString()
  phone!: string;

  @ApiProperty({ enum: ['email', 'sms', 'whatsapp'], example: 'whatsapp' })
  @IsEnum(['email', 'sms', 'whatsapp'])
  channel!: string;

  @ApiProperty({ description: 'Template ID to send' })
  @IsUUID()
  template_id!: string;

  @ApiPropertyOptional({
    description: 'Per-variable mapping (same shape as campaign create)',
    example: {
      '1': { type: 'system', key: 'patient_name' },
      '2': { type: 'custom', value: 'Ugadi special — 20% off!' },
    },
  })
  @IsOptional()
  @IsObject()
  template_variables?: Record<string, CampaignVariableMappingInput>;

  @ApiPropertyOptional({
    description: 'URL suffix for WhatsApp template URL buttons',
    example: 'https://www.smartdentaldesk.com/booking/smile',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  button_url_suffix?: string;
}
