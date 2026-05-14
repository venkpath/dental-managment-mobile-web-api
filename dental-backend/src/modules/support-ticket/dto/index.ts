import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TICKET_CATEGORIES = [
  'bug',
  'feature_request',
  'billing',
  'account',
  'general',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export class CreateSupportTicketDto {
  @ApiProperty({ enum: TICKET_CATEGORIES })
  @IsString()
  @IsIn(TICKET_CATEGORIES as unknown as string[])
  category!: TicketCategory;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;
}

export class UpdateSupportTicketDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(TICKET_STATUSES as unknown as string[])
  status?: TicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  admin_notes?: string;
}
