import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum, IsUUID, IsObject } from 'class-validator';

export class UpsertAutomationRuleDto {
  @ApiPropertyOptional({ description: 'Enable or disable this rule' })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional({ enum: ['email', 'sms', 'whatsapp', 'preferred'], description: 'Channel to use' })
  @IsOptional()
  @IsEnum(['email', 'sms', 'whatsapp', 'preferred'])
  channel?: string;

  @ApiPropertyOptional({ description: 'Template to use for this automation' })
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiPropertyOptional({
    description: 'Rule-specific config (e.g., { delay_hours: 3, dormancy_months: 6 })',
    example: { delay_hours: 3 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export const AUTOMATION_RULE_TYPES = [
  'birthday_greeting',
  'festival_greeting',
  'post_treatment_care',
  'no_show_followup',
  'dormant_reactivation',
  'treatment_plan_reminder',
  'payment_reminder',
  'feedback_collection',
  'appointment_reminder_patient',
  'anniversary_greeting',
  'prescription_refill',
] as const;

export type AutomationRuleType = typeof AUTOMATION_RULE_TYPES[number];
