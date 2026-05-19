import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Chat request for the Spendly expense advisor.
 * Message is grounded server-side using the clinic's expense data — no
 * client-supplied financials. Conversation continuity is opt-in via prior
 * messages echoed back to the API; we don't persist sessions.
 */
export class ExpenseAdvisorChatDto {
  @ApiProperty({ description: "User's question to the expense advisor", maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;

  @ApiPropertyOptional({
    description: 'Optional prior turns (user/assistant alternating). Last 6 turns max are used.',
    isArray: true,
  })
  @IsOptional()
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;

  @ApiPropertyOptional({ description: 'Limit context to a single branch' })
  @IsOptional()
  @IsString()
  branch_id?: string;
}
