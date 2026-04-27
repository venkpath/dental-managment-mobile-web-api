import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveReplyDto {
  /**
   * Optional override of the AI-generated reply. If omitted, the saved
   * `ai_draft` is posted as-is.
   */
  @ApiPropertyOptional({ description: 'Edited reply text (overrides AI draft)' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reply?: string;
}
