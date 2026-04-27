import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGoogleReviewSettingsDto {
  @ApiPropertyOptional({ description: 'Master toggle for auto-replying to new reviews' })
  @IsOptional()
  @IsBoolean()
  auto_reply_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Reviews with rating >= this value get auto-posted; below queues for clinic approval',
    minimum: 1,
    maximum: 5,
    default: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  auto_post_min_rating?: number;

  @ApiPropertyOptional({ enum: ['warm', 'formal', 'brief'] })
  @IsOptional()
  @IsIn(['warm', 'formal', 'brief'])
  tone?: 'warm' | 'formal' | 'brief';

  @ApiPropertyOptional({ description: 'Free-text guidance for the AI', example: 'Always offer a free re-consultation for unhappy patients.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  custom_instructions?: string;

  @ApiPropertyOptional({ description: 'Optional sign-off appended to replies', example: '— Team Smile Dental' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  signature?: string;

  @ApiPropertyOptional({ description: 'Notify admin when low-rating review needs approval' })
  @IsOptional()
  @IsBoolean()
  notify_admin_on_low?: boolean;
}
