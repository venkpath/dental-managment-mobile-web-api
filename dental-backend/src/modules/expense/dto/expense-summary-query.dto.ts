import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ExpenseSummaryQueryDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-04-01' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-04-30' })
  @IsDateString()
  end_date!: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;
}
